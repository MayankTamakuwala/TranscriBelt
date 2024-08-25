// src/pages/_app.tsx
import "@/styles/globals.css";
import type { AppProps } from "next/app";
import { Toaster } from "react-hot-toast";
import { ClerkProvider } from '@clerk/nextjs'
import HeaderLayout from "@/components/HeaderLayout";

export default function App({ Component, pageProps }: AppProps) {
    return (
        <ClerkProvider {...pageProps}>
            <HeaderLayout>
                <Component {...pageProps} />
                <Toaster position='top-right' />
            </HeaderLayout>
        </ClerkProvider>
    )
}
