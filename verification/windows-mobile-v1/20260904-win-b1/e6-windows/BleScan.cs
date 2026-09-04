using System;
using System.Collections.Generic;
using System.Threading;
using WBA = Windows.Devices.Bluetooth.Advertisement;

class BleScan
{
    static Dictionary<ulong, string> devices = new Dictionary<ulong, string>();
    static int events = 0;
    static object gate = new object();

    static void OnReceived(WBA.BluetoothLEAdvertisementWatcher s, WBA.BluetoothLEAdvertisementReceivedEventArgs e)
    {
        Interlocked.Increment(ref events);
        lock (gate)
        {
            string name = e.Advertisement.LocalName;
            string old;
            devices.TryGetValue(e.BluetoothAddress, out old);
            string baseName = name.Length > 0 ? name : (old != null ? old.Split('|')[0] : "");
            devices[e.BluetoothAddress] = baseName + "|rssi=" + e.RawSignalStrengthInDBm;
        }
    }

    static void OnStopped(WBA.BluetoothLEAdvertisementWatcher s, WBA.BluetoothLEAdvertisementWatcherStoppedEventArgs e)
    {
        Console.WriteLine("WATCHER-STOPPED err=" + e.Error);
    }

    static void Main(string[] args)
    {
        int dur = args.Length > 0 ? int.Parse(args[0]) : 20;
        var watcher = new WBA.BluetoothLEAdvertisementWatcher();
        watcher.ScanningMode = WBA.BluetoothLEScanningMode.Active;
        watcher.Received += OnReceived;
        watcher.Stopped += OnStopped;

        watcher.Start();
        Console.WriteLine("STATUS-AFTER-START: " + watcher.Status);
        Thread.Sleep(dur * 1000);
        watcher.Stop();
        Thread.Sleep(800);
        Console.WriteLine("STATUS-AFTER-STOP: " + watcher.Status);
        Console.WriteLine("EVENTS: " + events);
        Console.WriteLine("DEVICES: " + devices.Count);
        lock (gate)
        {
            foreach (var kv in devices)
                Console.WriteLine("DEVICE " + kv.Key.ToString("X12") + " " + kv.Value);
        }
    }
}
