using System;
using System.Linq;
using System.Threading;
using Windows.Devices.Bluetooth;
using Windows.Devices.Bluetooth.GenericAttributeProfile;

class BleConnect
{
    static void Log(string m) { Console.WriteLine("[" + DateTime.Now.ToString("HH:mm:ss.fff") + "] " + m); }

    static TResult Block<TResult>(Windows.Foundation.IAsyncOperation<TResult> op, int timeoutMs)
    {
        var done = new ManualResetEventSlim(false);
        TResult result = default(TResult);
        Exception err = null;
        op.Completed = new Windows.Foundation.AsyncOperationCompletedHandler<TResult>((o, s) =>
        {
            try { result = o.GetResults(); } catch (Exception e) { err = e; }
            done.Set();
        });
        if (!done.Wait(timeoutMs)) throw new TimeoutException("async op timeout " + timeoutMs + "ms");
        if (err != null) throw err;
        return result;
    }


    static byte[] ToBytes(Windows.Storage.Streams.IBuffer buf)
    {
        var reader = Windows.Storage.Streams.DataReader.FromBuffer(buf);
        var b = new byte[buf.Length];
        for (int i = 0; i < buf.Length; i++) b[i] = reader.ReadByte();
        return b;
    }

    static Windows.Storage.Streams.IBuffer ToBuffer(byte[] data)
    {
        var writer = new Windows.Storage.Streams.DataWriter();
        writer.WriteBytes(data);
        return writer.DetachBuffer();
    }

    static void Main(string[] args)
    {
        ulong addr = args.Length > 0 ? Convert.ToUInt64(args[0], 16) : 0x10B41DCD238D;
        Log("connecting to " + addr.ToString("X12"));
        var dev = Block(BluetoothLEDevice.FromBluetoothAddressAsync(addr), 15000);
        if (dev == null) { Log("FAIL: FromBluetoothAddressAsync returned null"); return; }
        Log("device opened, name=" + dev.Name + " status=" + dev.ConnectionStatus);

        var svcRes = Block(dev.GetGattServicesAsync(BluetoothCacheMode.Uncached), 15000);
        Log("services status=" + svcRes.Status + " count=" + (svcRes.Services != null ? svcRes.Services.Count : -1));

        foreach (var svc in svcRes.Services)
        {
            Log("SERVICE " + svc.Uuid);
            var chRes = Block(svc.GetCharacteristicsAsync(BluetoothCacheMode.Uncached), 15000);
            if (chRes.Status != GattCommunicationStatus.Success) { Log("  chars failed " + chRes.Status); continue; }
            foreach (var ch in chRes.Characteristics)
                Log("  CHAR " + ch.Uuid + " props=" + ch.CharacteristicProperties);
        }

        foreach (var svc in svcRes.Services)
        {
            var shortId = svc.Uuid.ToString().Substring(4, 4);
            if (shortId != "1800") continue;
            var chs = Block(svc.GetCharacteristicsAsync(BluetoothCacheMode.Uncached), 15000);
            foreach (var c in chs.Characteristics)
            {
                var rr = Block(c.ReadValueAsync(BluetoothCacheMode.Uncached), 10000);
                if (rr.Status == GattCommunicationStatus.Success)
                {
                    var bytes = ToBytes(rr.Value);
                    Log("READ " + c.Uuid + " -> " + BitConverter.ToString(bytes) + " text=" + System.Text.Encoding.UTF8.GetString(bytes));
                }
                else Log("READ " + c.Uuid + " failed " + rr.Status);
            }
        }

        var writeCharUuid = new Guid("beb5483e-36e1-4688-b7f5-ea07361b26b1");
        foreach (var svc in svcRes.Services)
        {
            var chs = Block(svc.GetCharacteristicsAsync(BluetoothCacheMode.Uncached), 15000);
            foreach (var c in chs.Characteristics)
            {
                if (c.Uuid == writeCharUuid)
                {
                    byte[] payload = System.Text.Encoding.UTF8.GetBytes("win-gatt-write");
                    var wr = Block(c.WriteValueAsync(ToBuffer(payload), GattWriteOption.WriteWithResponse), 10000);
                    Log("WRITE " + c.Uuid + " -> " + wr + " (payload=win-gatt-write)");
                }
            }
        }

        Thread.Sleep(1000);
        Log("connection status before dispose: " + dev.ConnectionStatus);
        dev.Dispose();
        Log("disposed");
    }
}
