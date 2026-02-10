// components/ui/Logo.tsx
import Image from 'next/image'

interface LogoProps {
    className?: string
    variant?: 'light' | 'dark'
    size?: 'sm' | 'md' | 'lg'
}


export function LogoImage({ size = 'md', variant = 'light', className = '', }: LogoProps) {
    const sizes = {
        sm: { width: 120, height: 30 },
        md: { width: 160, height: 40 },
        lg: { width: 200, height: 50 },
    } as const;

    const currentSize = sizes[size];
    const src = variant === 'dark' ? '/banner_dark.png' : '/banner.png'


    return (
        <Image
            src={src}
            alt="OcoVoto"
            width={currentSize.width}
            height={currentSize.height}
            className="h-16 w-auto object-contain"
            priority
        />
    )
}