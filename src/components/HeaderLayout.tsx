// src/components/HeaderLayout.tsx
import { UserButton } from "@clerk/nextjs";
import Link from 'next/link';

interface LayoutProps {
    children: React.ReactNode;
}

export default function HeaderLayout({ children }: LayoutProps) {
    return (
        <div className="min-h-screen flex flex-col">
            <header className="fixed top-0 left-0 right-0 px-4 lg:px-0 h-14 border-b-2 bg-white z-50">
                <div className=" mx-auto px-4 sm:px-6 lg:px-8 py-4 flex justify-between items-center">
                    <Link href="/" className="text-xl font-bold text-gray-800">
                        App Name
                    </Link>
                    <UserButton afterSignOutUrl="/" />
                </div>
            </header>
            <main className="flex-grow">
                {children}
            </main>
        </div>
    );
}
