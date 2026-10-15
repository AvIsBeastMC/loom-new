import { type AppType } from "next/app";
import { Geist } from "next/font/google";

import { api } from "~/utils/api";
// @ts-ignore
import "~/styles/globals.css";

import {Toaster} from 'react-hot-toast'

const geist = Geist({
  subsets: ["latin"],
});

const MyApp: AppType = ({ Component, pageProps }) => {
  return (
    <div className={geist.className}>
      <Component {...pageProps} />
      <Toaster />
    </div>
  );
};

export default api.withTRPC(MyApp);
