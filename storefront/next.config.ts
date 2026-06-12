import type { NextConfig } from "next";
import { getStorefrontImageRemotePatterns } from "./lib/images";

const nextConfig: NextConfig = {
  images: {
    remotePatterns: getStorefrontImageRemotePatterns(),
  },
  output: "standalone",
};

export default nextConfig;
