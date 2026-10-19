//! One queue per connection session. A timeout retires the session: native drivers
//! may complete a cancelled future later, so no further writes use those handles.
use std::{future::Future, sync::Arc, time::Duration};
use tokio::sync::{watch, Mutex, Semaphore};

pub const WRITE_QUEUE_DEPTH: usize = 16;
pub const WRITE_TIMEOUT: Duration = Duration::from_secs(5);
pub const READ_TIMEOUT: Duration = Duration::from_secs(3);
pub const CONNECT_TIMEOUT: Duration = Duration::from_secs(10);

pub struct WriteQueue {
    capacity: Arc<Semaphore>,
    serial: Mutex<()>,
    closed: watch::Sender<bool>,
}

impl WriteQueue {
    pub fn new() -> Self {
        let (closed, _) = watch::channel(false);
        Self {
            capacity: Arc::new(Semaphore::new(WRITE_QUEUE_DEPTH)),
            serial: Mutex::new(()),
            closed,
        }
    }

    pub fn close(&self) {
        self.closed.send_replace(true);
        self.capacity.close();
    }

    pub fn is_closed(&self) -> bool {
        *self.closed.borrow()
    }

    pub async fn run<T, F>(&self, timeout: Duration, operation: F) -> Result<T, String>
    where
        F: Future<Output = Result<T, String>>,
    {
        if self.is_closed() {
            return Err("Device disconnected".into());
        }
        // Capacity includes the active write. Never await capacity: fail at 16.
        let _slot = self.capacity.clone().try_acquire_owned().map_err(|_| {
            if self.is_closed() {
                "Device disconnected"
            } else {
                "Write queue full (16)"
            }
            .to_string()
        })?;
        let mut closed = self.closed.subscribe();
        if *closed.borrow() {
            return Err("Device disconnected".into());
        }
        let _serial = tokio::select! {
            biased;
            _ = closed.changed() => return Err("Device disconnected".into()),
            guard = self.serial.lock() => guard,
        };
        if self.is_closed() {
            return Err("Device disconnected".into());
        }
        tokio::select! {
            biased;
            _ = closed.changed() => Err("Device disconnected".into()),
            result = tokio::time::timeout(timeout, operation) => match result {
                Ok(result) => result,
                Err(_) => { self.close(); Err("Write timed out".into()) }
            },
        }
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use std::sync::atomic::{AtomicUsize, Ordering};

    #[tokio::test]
    async fn same_device_serial_different_devices_parallel() {
        let queue = Arc::new(WriteQueue::new());
        let active = Arc::new(AtomicUsize::new(0));
        let mut tasks = vec![];
        for _ in 0..4 {
            let queue = queue.clone();
            let active = active.clone();
            tasks.push(tokio::spawn(async move {
                queue
                    .run(Duration::from_secs(1), async {
                        assert_eq!(active.fetch_add(1, Ordering::SeqCst), 0);
                        tokio::time::sleep(Duration::from_millis(5)).await;
                        active.fetch_sub(1, Ordering::SeqCst);
                        Ok(())
                    })
                    .await
                    .unwrap();
            }));
        }
        for task in tasks {
            task.await.unwrap();
        }
        let a = WriteQueue::new();
        let b = WriteQueue::new();
        let barrier = Arc::new(tokio::sync::Barrier::new(2));
        let op = || async {
            barrier.wait().await;
            Ok(())
        };
        let (a, b) = tokio::join!(
            a.run(Duration::from_secs(1), op()),
            b.run(Duration::from_secs(1), op())
        );
        assert!(a.is_ok() && b.is_ok());
    }

    #[tokio::test]
    async fn capacity_includes_active_and_disconnect_cancels_every_write() {
        let queue = Arc::new(WriteQueue::new());
        let mut tasks = vec![];
        for _ in 0..WRITE_QUEUE_DEPTH {
            let queue = queue.clone();
            tasks.push(tokio::spawn(async move {
                queue
                    .run(
                        Duration::from_secs(1),
                        std::future::pending::<Result<(), String>>(),
                    )
                    .await
            }));
        }
        while queue.capacity.available_permits() != 0 {
            tokio::task::yield_now().await;
        }
        assert_eq!(
            queue
                .run(Duration::from_secs(1), async { Ok(()) })
                .await
                .unwrap_err(),
            "Write queue full (16)"
        );
        queue.close();
        for task in tasks {
            assert_eq!(task.await.unwrap().unwrap_err(), "Device disconnected");
        }
    }

    #[tokio::test]
    async fn timeout_retires_session_and_rejects_queued_write() {
        let queue = Arc::new(WriteQueue::new());
        let first = {
            let queue = queue.clone();
            tokio::spawn(async move {
                queue
                    .run(
                        Duration::from_millis(20),
                        std::future::pending::<Result<(), String>>(),
                    )
                    .await
            })
        };
        while queue.capacity.available_permits() == WRITE_QUEUE_DEPTH {
            tokio::task::yield_now().await;
        }
        let next = queue.run(Duration::from_secs(1), async {
            panic!("stale write ran");
            #[allow(unreachable_code)]
            Ok(())
        });
        let (_, next) = tokio::join!(
            async {
                assert_eq!(first.await.unwrap().unwrap_err(), "Write timed out");
            },
            next
        );
        assert_eq!(next.unwrap_err(), "Device disconnected");
        assert!(queue.is_closed());
    }
}
