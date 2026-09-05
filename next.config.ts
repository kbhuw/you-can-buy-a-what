import type { NextConfig } from 'next';
import {basePath} from './lib/site';
const config:NextConfig={
  basePath,
  async redirects() {
    return [{source:'/',destination:basePath,permanent:false,basePath:false}];
  },
};
export default config;
