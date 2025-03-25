'use client';

export default function DisplayLayout({
                                          children,
                                      }: {
    children: React.ReactNode;
}) {
    return (
        <div className="bg-gray-900 text-white min-h-screen">
            {children}
        </div>
    );
}