import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  headers: async () => {
    return [
      {
        source: '/audioProcessor.js',
        headers: [
          {
            key: 'Content-Type',
            value: 'application/javascript',
          },
        ],
      },
    ];
  },
};

export default nextConfig;
