using System;

namespace YouTubeOverlayVirtualCam;

internal static class VirtualCamManager
{
  private static readonly string[] CandidateDlls =
  {
    "mfvirtualcamera.dll",
    "mfplat.dll",
  };

  public static bool IsMfVirtualCameraAvailable()
  {
    foreach (var dll in CandidateDlls)
    {
      try
      {
        if (!NativeMethods.TryLoadLibrary(dll, out var handle, out var err))
        {
          Console.Error.WriteLine(
            $"LoadLibrary failed ({dll}): {err} {NativeMethods.FormatWin32Error(err)}");
          continue;
        }

        try
        {
          if (NativeMethods.HasExport(handle, "MFCreateVirtualCamera"))
          {
            return true;
          }
          Console.Error.WriteLine($"Export not found in {dll}: MFCreateVirtualCamera");
        }
        finally
        {
          NativeMethods.FreeLibraryHandle(handle);
        }
      }
      catch (Exception ex)
      {
        Console.Error.WriteLine($"IsMfVirtualCameraAvailable error ({dll}): {ex.GetType().Name} {ex.Message}");
      }
    }

    return false;
  }

  public static int RegisterVirtualCamera(VirtualCamOptions options)
  {
    if (!IsMfVirtualCameraAvailable())
    {
      Console.Error.WriteLine("Media Foundation Virtual Camera API not available.");
      return 2;
    }

    try
    {
      using var _ = new MfStartupScope();
    }
    catch (Exception ex)
    {
      Console.Error.WriteLine($"MFStartup failed: {ex.Message}");
      return 3;
    }
    IMFVirtualCamera? virtualCam = null;
    int hr;
    try
    {
      hr = MfInterop.MFCreateVirtualCamera(
        options.Type,
        options.Lifetime,
        options.Access,
        options.FriendlyName,
        options.SourceId,
        IntPtr.Zero,
        0,
        out virtualCam);
    }
    catch (Exception ex)
    {
      Console.Error.WriteLine($"MFCreateVirtualCamera threw: {ex.GetType().Name} {ex.Message}");
      return 5;
    }
    if (hr != 0 || virtualCam == null)
    {
      Console.Error.WriteLine($"MFCreateVirtualCamera failed: 0x{hr:X8}");
      return 3;
    }

    try
    {
      hr = virtualCam.Start(null);
      if (hr != 0)
      {
        Console.Error.WriteLine($"IMFVirtualCamera.Start failed: 0x{hr:X8}");
        return 4;
      }
      Console.WriteLine("Virtual camera registered.");
      return 0;
    }
    finally
    {
      virtualCam.Shutdown();
      MfInterop.ReleaseComObject(virtualCam);
    }
  }

  public static int UnregisterVirtualCamera(VirtualCamOptions options)
  {
    if (!IsMfVirtualCameraAvailable())
    {
      Console.Error.WriteLine("Media Foundation Virtual Camera API not available.");
      return 2;
    }

    try
    {
      using var _ = new MfStartupScope();
    }
    catch (Exception ex)
    {
      Console.Error.WriteLine($"MFStartup failed: {ex.Message}");
      return 3;
    }
    IMFVirtualCamera? virtualCam = null;
    int hr;
    try
    {
      hr = MfInterop.MFCreateVirtualCamera(
        options.Type,
        options.Lifetime,
        options.Access,
        options.FriendlyName,
        options.SourceId,
        IntPtr.Zero,
        0,
        out virtualCam);
    }
    catch (Exception ex)
    {
      Console.Error.WriteLine($"MFCreateVirtualCamera threw: {ex.GetType().Name} {ex.Message}");
      return 5;
    }
    if (hr != 0 || virtualCam == null)
    {
      Console.Error.WriteLine($"MFCreateVirtualCamera failed: 0x{hr:X8}");
      return 3;
    }

    try
    {
      hr = virtualCam.Remove();
      if (hr != 0)
      {
        Console.Error.WriteLine($"IMFVirtualCamera.Remove failed: 0x{hr:X8}");
        return 4;
      }
      Console.WriteLine("Virtual camera removed.");
      return 0;
    }
    finally
    {
      virtualCam.Shutdown();
      MfInterop.ReleaseComObject(virtualCam);
    }
  }
}
