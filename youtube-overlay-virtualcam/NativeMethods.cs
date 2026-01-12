using System;
using System.Runtime.InteropServices;

namespace YouTubeOverlayVirtualCam;

internal static class NativeMethods
{
    [DllImport("kernel32.dll", SetLastError = true, CharSet = CharSet.Unicode)]
    private static extern IntPtr LoadLibrary(string lpFileName);

    [DllImport("kernel32.dll", SetLastError = true, EntryPoint = "FreeLibrary")]
    private static extern bool FreeLibraryNative(IntPtr hModule);

    [DllImport("kernel32.dll", SetLastError = true, CharSet = CharSet.Ansi)]
    private static extern IntPtr GetProcAddress(IntPtr hModule, string procName);

    public static bool TryLoadLibrary(string name, out IntPtr handle, out int error)
    {
        error = 0;
        handle = LoadLibrary(name);
        if (handle == IntPtr.Zero)
        {
            error = Marshal.GetLastWin32Error();
            return false;
        }
        return handle != IntPtr.Zero;
    }

    public static void FreeLibraryHandle(IntPtr handle)
    {
        if (handle != IntPtr.Zero)
        {
            FreeLibraryNative(handle);
        }
    }

    public static bool HasExport(IntPtr handle, string exportName)
    {
        if (handle == IntPtr.Zero)
        {
            return false;
        }
        return GetProcAddress(handle, exportName) != IntPtr.Zero;
    }

    public static string FormatWin32Error(int code)
    {
        const int FORMAT_MESSAGE_FROM_SYSTEM = 0x00001000;
        const int FORMAT_MESSAGE_IGNORE_INSERTS = 0x00000200;
        Span<char> buffer = stackalloc char[512];
        var result = FormatMessage(
            FORMAT_MESSAGE_FROM_SYSTEM | FORMAT_MESSAGE_IGNORE_INSERTS,
            IntPtr.Zero,
            (uint)code,
            0,
            buffer,
            (uint)buffer.Length,
            IntPtr.Zero);
        if (result == 0)
        {
            return $"Win32Error {code}";
        }
        return buffer[..(int)result].ToString().Trim();
    }

    [DllImport("kernel32.dll", SetLastError = true, CharSet = CharSet.Unicode)]
    private static extern uint FormatMessage(
        int dwFlags,
        IntPtr lpSource,
        uint dwMessageId,
        uint dwLanguageId,
        Span<char> lpBuffer,
        uint nSize,
        IntPtr Arguments);
}
