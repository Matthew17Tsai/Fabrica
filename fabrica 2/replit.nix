{ pkgs }:
{
  deps = [
    pkgs.nodejs_20
    pkgs.nodePackages.npm
    pkgs.potrace
    pkgs.chromium
    pkgs.vips
  ];
  env = {
    PUPPETEER_SKIP_CHROMIUM_DOWNLOAD = "true";
    PUPPETEER_EXECUTABLE_PATH = "${pkgs.chromium}/bin/chromium";
    LD_LIBRARY_PATH = pkgs.lib.makeLibraryPath [
      pkgs.vips
    ];
  };
}
