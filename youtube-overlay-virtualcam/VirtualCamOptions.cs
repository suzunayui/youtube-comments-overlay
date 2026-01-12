using System;

namespace YouTubeOverlayVirtualCam;

internal sealed record VirtualCamOptions
{
    public MFVirtualCameraType Type { get; init; } = MFVirtualCameraType.SoftwareCameraSource;
    public MFVirtualCameraLifetime Lifetime { get; init; } = MFVirtualCameraLifetime.System;
    public MFVirtualCameraAccess Access { get; init; } = MFVirtualCameraAccess.AllUsers;
    public string FriendlyName { get; init; } = "YouTube Overlay VirtualCam";
    public string SourceId { get; init; } = "youtube-overlay-virtualcam";

    public static VirtualCamOptions FromArgs(string[] args)
    {
        var options = new VirtualCamOptions();
        for (var i = 1; i < args.Length; i++)
        {
            var arg = args[i];
            if (arg == "--name" && i + 1 < args.Length)
            {
                options = options with { FriendlyName = args[++i] };
            }
            else if (arg == "--source" && i + 1 < args.Length)
            {
                options = options with { SourceId = args[++i] };
            }
            else if (arg == "--lifetime" && i + 1 < args.Length)
            {
                var v = args[++i].ToLowerInvariant();
                options = options with
                {
                    Lifetime = v == "session" ? MFVirtualCameraLifetime.Session : MFVirtualCameraLifetime.System
                };
            }
            else if (arg == "--access" && i + 1 < args.Length)
            {
                var v = args[++i].ToLowerInvariant();
                options = options with
                {
                    Access = v == "current" ? MFVirtualCameraAccess.CurrentUser : MFVirtualCameraAccess.AllUsers
                };
            }
        }

        return options;
    }
}
