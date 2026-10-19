using System;
using System.Collections.Generic;
using System.Globalization;
using System.Linq;
using System.Text;
using System.Threading;
using Windows.Storage.Streams;
using WBA = Windows.Devices.Bluetooth.Advertisement;

class BleAdvDump
{
    class Rec
    {
        public string Name = "";
        public List<string> ServiceUuids = new List<string>();
        public List<string> MfrData = new List<string>();
        public bool Connectable;
        public short RssiMin = short.MaxValue, RssiMax = short.MinValue;
        public int Count;
        public string First = "", Last = "";
        public bool HasName;
    }

    static Dictionary<ulong, Rec> recs = new Dictionary<ulong, Rec>();
    static object gate = new object();
    static int events = 0;

    static string Ts() { return DateTime.Now.ToString("HH:mm:ss.fff"); }

    static string Hex(byte[] b) { return b == null || b.Length == 0 ? "" : BitConverter.ToString(b).Replace("-", ""); }

    static void OnReceived(WBA.BluetoothLEAdvertisementWatcher s, WBA.BluetoothLEAdvertisementReceivedEventArgs e)
    {
        Interlocked.Increment(ref events);
        lock (gate)
        {
            Rec r;
            if (!recs.TryGetValue(e.BluetoothAddress, out r)) { r = new Rec(); recs[e.BluetoothAddress] = r; }
            var now = Ts();
            if (r.First == "") r.First = now;
            r.Last = now;
            r.Count++;
            if (e.RawSignalStrengthInDBm < r.RssiMin) r.RssiMin = e.RawSignalStrengthInDBm;
            if (e.RawSignalStrengthInDBm > r.RssiMax) r.RssiMax = e.RawSignalStrengthInDBm;
            r.Connectable |= e.AdvertisementType == WBA.BluetoothLEAdvertisementType.ConnectableUndirected
                          || e.AdvertisementType == WBA.BluetoothLEAdvertisementType.ConnectableDirected;
            var n = e.Advertisement.LocalName;
            if (!string.IsNullOrEmpty(n)) { r.Name = n; r.HasName = true; }
            foreach (var u in e.Advertisement.ServiceUuids) { var us = u.ToString(); if (!r.ServiceUuids.Contains(us)) r.ServiceUuids.Add(us); }
            foreach (var m in e.Advertisement.ManufacturerData)
            {
                var bytes = new byte[m.Data.Length];
                using (var dr = DataReader.FromBuffer(m.Data)) for (int i = 0; i < bytes.Length; i++) bytes[i] = dr.ReadByte();
                var entry = m.CompanyId.ToString("X4") + ":" + Hex(bytes);
                if (!r.MfrData.Contains(entry)) r.MfrData.Add(entry);
            }
        }
    }

    static void Main(string[] args)
    {
        int dur = args.Length > 0 ? int.Parse(args[0]) : 15;
        string filter = args.Length > 1 ? args[1] : "";
        var watcher = new WBA.BluetoothLEAdvertisementWatcher();
        watcher.ScanningMode = WBA.BluetoothLEScanningMode.Active;
        watcher.Received += OnReceived;
        watcher.Start();
        Console.WriteLine("ADV-DUMP start dur=" + dur + "s filter=" + (filter == "" ? "(none)" : filter));
        Thread.Sleep(dur * 1000);
        watcher.Stop();
        Thread.Sleep(600);
        Console.WriteLine("EVENTS: " + events + "  UNIQUE-ADDRESSES: " + recs.Count);
        List<KeyValuePair<ulong, Rec>> list;
        lock (gate) list = recs.ToList();
        foreach (var kv in list.OrderByDescending(x => x.Value.Count))
        {
            var r = kv.Value;
            string line = kv.Key.ToString("X12") + " n=" + r.Count + " rssi=" + r.RssiMax + "/" + r.RssiMin
                + " name=[" + r.Name + "] conn=" + (r.Connectable ? 1 : 0)
                + " uuids=" + (r.ServiceUuids.Count == 0 ? "-" : string.Join(",", r.ServiceUuids.Select(u => u.Substring(0, 8)).ToArray()))
                + " mfr=" + (r.MfrData.Count == 0 ? "-" : string.Join(";", r.MfrData.ToArray()));
            if (filter == "" || line.Contains(filter)) Console.WriteLine(line);
        }
        Console.WriteLine("ADV-DUMP end");
    }
}
