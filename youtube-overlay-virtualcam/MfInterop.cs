using System;
using System.Runtime.InteropServices;

namespace YouTubeOverlayVirtualCam;

internal static class MfInterop
{
    public const int MF_VERSION = 0x00020070;

    [DllImport("mfplat.dll", SetLastError = true)]
    public static extern int MFStartup(int version, int dwFlags);

    [DllImport("mfplat.dll", SetLastError = true)]
    public static extern int MFShutdown();

    [DllImport("mfvirtualcamera.dll", CharSet = CharSet.Unicode)]
    public static extern int MFCreateVirtualCamera(
        MFVirtualCameraType type,
        MFVirtualCameraLifetime lifetime,
        MFVirtualCameraAccess access,
        [MarshalAs(UnmanagedType.LPWStr)] string friendlyName,
        [MarshalAs(UnmanagedType.LPWStr)] string sourceId,
        IntPtr categories,
        uint categoryCount,
        out IMFVirtualCamera virtualCamera);

    public static void ReleaseComObject(object comObject)
    {
        if (comObject != null && Marshal.IsComObject(comObject))
        {
            Marshal.ReleaseComObject(comObject);
        }
    }
}

internal sealed class MfStartupScope : IDisposable
{
    private bool _started;

    public MfStartupScope()
    {
        var hr = MfInterop.MFStartup(MfInterop.MF_VERSION, 0);
        _started = hr == 0;
        if (!_started)
        {
            throw new InvalidOperationException($"MFStartup failed: 0x{hr:X8}");
        }
    }

    public void Dispose()
    {
        if (_started)
        {
            MfInterop.MFShutdown();
            _started = false;
        }
    }
}

internal enum MFVirtualCameraType
{
    SoftwareCameraSource = 0
}

internal enum MFVirtualCameraLifetime
{
    Session = 0,
    System = 1
}

internal enum MFVirtualCameraAccess
{
    CurrentUser = 0,
    AllUsers = 1
}

[StructLayout(LayoutKind.Sequential)]
internal struct DEVPROPKEY
{
    public Guid fmtid;
    public uint pid;
}

[StructLayout(LayoutKind.Sequential)]
internal struct PropVariant
{
    public ushort vt;
    public ushort wReserved1;
    public ushort wReserved2;
    public ushort wReserved3;
    public IntPtr ptr;
    public int ptr2;
}

[ComImport]
[Guid("2CD2D921-C447-44A7-A13C-4ADABFC247E3")]
[InterfaceType(ComInterfaceType.InterfaceIsIUnknown)]
internal interface IMFAttributes
{
    int GetItem(ref Guid guidKey, out PropVariant value);
    int GetItemType(ref Guid guidKey, out int type);
    int CompareItem(ref Guid guidKey, ref PropVariant value, out int result);
    int Compare(IMFAttributes theirs, int matchType, out int result);
    int GetUINT32(ref Guid guidKey, out uint value);
    int GetUINT64(ref Guid guidKey, out ulong value);
    int GetDouble(ref Guid guidKey, out double value);
    int GetGUID(ref Guid guidKey, out Guid value);
    int GetStringLength(ref Guid guidKey, out uint length);
    int GetString(ref Guid guidKey, [MarshalAs(UnmanagedType.LPWStr)] string value, uint size, out uint length);
    int GetAllocatedString(ref Guid guidKey, out IntPtr value, out uint length);
    int GetBlobSize(ref Guid guidKey, out uint size);
    int GetBlob(ref Guid guidKey, IntPtr buf, uint size, out uint sizeCopied);
    int GetAllocatedBlob(ref Guid guidKey, out IntPtr buf, out uint size);
    int GetUnknown(ref Guid guidKey, ref Guid riid, [MarshalAs(UnmanagedType.IUnknown)] out object obj);
    int SetItem(ref Guid guidKey, ref PropVariant value);
    int DeleteItem(ref Guid guidKey);
    int DeleteAllItems();
    int SetUINT32(ref Guid guidKey, uint value);
    int SetUINT64(ref Guid guidKey, ulong value);
    int SetDouble(ref Guid guidKey, double value);
    int SetGUID(ref Guid guidKey, ref Guid value);
    int SetString(ref Guid guidKey, [MarshalAs(UnmanagedType.LPWStr)] string value);
    int SetBlob(ref Guid guidKey, IntPtr buf, uint size);
    int SetUnknown(ref Guid guidKey, [MarshalAs(UnmanagedType.IUnknown)] object obj);
    int LockStore();
    int UnlockStore();
    int GetCount(out uint count);
    int GetItemByIndex(uint index, out Guid guidKey, out PropVariant value);
    int CopyAllItems(IMFAttributes dest);
}

[ComImport]
[Guid("1C08A864-EF6C-4C75-AF59-5F2D68DA9563")]
[InterfaceType(ComInterfaceType.InterfaceIsIUnknown)]
internal interface IMFVirtualCamera : IMFAttributes
{
    int AddDeviceSourceInfo([MarshalAs(UnmanagedType.LPWStr)] string deviceSourceInfo);
    int AddProperty(ref DEVPROPKEY key, uint type, IntPtr data, uint dataSize);
    int AddRegistryEntry([MarshalAs(UnmanagedType.LPWStr)] string entryName, [MarshalAs(UnmanagedType.LPWStr)] string subkeyPath, uint regType, IntPtr data, uint dataSize);
    int Start([MarshalAs(UnmanagedType.Interface)] IMFAsyncCallback? callback);
    int Stop();
    int Remove();
    int GetMediaSource(out IMFMediaSource mediaSource);
    int SendCameraProperty(ref Guid propertySet, uint propertyId, uint propertyFlags, IntPtr propertyPayload, uint propertyPayloadLength, IntPtr data, uint dataLength, out uint dataWritten);
    int CreateSyncEvent(ref Guid kseventSet, uint kseventId, uint kseventFlags, IntPtr eventHandle, out IMFCameraSyncObject cameraSyncObject);
    int CreateSyncSemaphore(ref Guid kseventSet, uint kseventId, uint kseventFlags, IntPtr semaphoreHandle, int semaphoreAdjustment, out IMFCameraSyncObject cameraSyncObject);
    int Shutdown();
}

[ComImport]
[Guid("A27003CF-2354-4F2A-8D6A-AB7CFF15437E")]
[InterfaceType(ComInterfaceType.InterfaceIsIUnknown)]
internal interface IMFAsyncCallback
{
    int GetParameters(out uint flags, out uint queue);
    int Invoke(IntPtr asyncResult);
}

[ComImport]
[Guid("279A808D-AEC7-40C8-9C6B-A6B492C78A66")]
[InterfaceType(ComInterfaceType.InterfaceIsIUnknown)]
internal interface IMFMediaSource
{
}

[ComImport]
[Guid("6338B23A-3042-49D2-A3EA-EC0FED815407")]
[InterfaceType(ComInterfaceType.InterfaceIsIUnknown)]
internal interface IMFCameraSyncObject
{
    int WaitOnSignal(uint timeoutMs);
    void Shutdown();
}
