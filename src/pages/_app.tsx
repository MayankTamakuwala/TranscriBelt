"use client";
// src/pages/_app.tsx
import "@/styles/globals.css";
import type { AppProps } from "next/app";
import { Toaster } from "react-hot-toast";
import { ClerkProvider, UserButton, useAuth } from '@clerk/nextjs'
import React, { useEffect, useState } from "react";
import { Sidebar, SidebarBody, SidebarLink } from "@/components/ui/sidebar";
import { cn } from "@/lib/utils";
import HeaderLayout from "@/components/HeaderLayout";
import Link from "next/link";
import { IconFolder } from "@/assets/Icons";
import {motion} from 'framer-motion'

const AppContent = ({ Component, pageProps }: AppProps) => {
    const { isSignedIn } = useAuth();
    const [open, setOpen] = useState(false);
    const [folders, setFolders] = useState<string[]>([]);

    useEffect(() => {
        const fetchFolders = async () => {
            try {
                const response = await fetch('/api/s3/getS3Contents');
                const data = await response.json();
                if (Array.isArray(data.folders)) {
                    setFolders(data.folders);
                } else {
                    console.error('Unexpected data format:', data);
                }
            } catch (error) {
                console.error('Error fetching folders:', error);
            }
        };

        if (isSignedIn) {
            fetchFolders();
        }
    }, [isSignedIn]);

    const links = [
        ...folders.map(folder => ({
            label: folder,
            href: `/videos/${folder}`,
            icon: (
                <IconFolder className="text-neutral-700 dark:text-neutral-200 h-5 w-5 flex-shrink-0" />
            ),
        })),
    ];

    if (!isSignedIn) {
        return (
            <HeaderLayout>
                <Component {...pageProps} />
                <Toaster position='top-right' />
            </HeaderLayout>
        );
    }

    return (
        <div
            className={cn(
                "rounded-md flex flex-col md:flex-row bg-gray-100 dark:bg-neutral-800 w-full mx-auto border border-neutral-200 dark:border-neutral-700 overflow-hidden",
                "h-screen"
            )}
        >
            <Sidebar open={open} setOpen={setOpen} animate={false}>
                <SidebarBody className="justify-between gap-10">
                    <div className="flex flex-col flex-1 overflow-y-auto overflow-x-hidden">
                        <div className="mt-8 flex flex-col gap-2">
                            <>
                                <Logo/>
                            </>
                            {links.map((link, idx) => (
                                <Link key={idx} href={link.href} passHref>
                                    <SidebarLink link={link} />
                                </Link>
                            ))}
                        </div>
                    </div>
                    <div>
                        <UserButton />
                    </div>
                </SidebarBody>
            </Sidebar>
            <Component {...pageProps} />
            <Toaster position='top-right' />
        </div>
    );
};


export default function App(props: AppProps) {
    return (
        <ClerkProvider {...props.pageProps}>
            <AppContent {...props} />
        </ClerkProvider>
    );
}


export const Logo = () => {
    return (
        <Link
            href="/"
            className="font-normal flex space-x-2 items-center text-sm text-black py-1 relative z-20"
        >
            <div className="h-5 w-6 bg-black dark:bg-white rounded-br-lg rounded-tr-sm rounded-tl-lg rounded-bl-sm flex-shrink-0" />
            <motion.span
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="font-medium text-black dark:text-white whitespace-pre"
            >
                Upload Video
            </motion.span>
        </Link>
    );
};
export const LogoIcon = () => {
    return (
        <Link
            href="#"
            className="font-normal flex space-x-2 items-center text-sm text-black py-1 relative z-20"
        >
            <div className="h-5 w-6 bg-black dark:bg-white rounded-br-lg rounded-tr-sm rounded-tl-lg rounded-bl-sm flex-shrink-0" />
        </Link>
    );
};