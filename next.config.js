/** @type {import('next').NextConfig} */
const nextConfig = {}

module.exports = {
  experimental: {
    esmExternals: "loose", // 或者 "loose"
    // 或者使用下面的配置
    // serverComponentsExternalPackages: ["supports-color"],
  },
};
