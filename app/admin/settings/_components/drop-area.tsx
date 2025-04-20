import { cn } from '@/lib/utils';
import { useState } from 'react'

interface DropAreaProps {
    onDrop: () => void;
}

const DropArea = ({
    onDrop,
}: DropAreaProps) => {
    const [showDrop, setShowDrop] = useState(false);

    return (
        <section
            className={cn(
                'w-full border border-muted-foreground rounded-lg p-1 mb-2 transition-all duration-200 ease-in-out',
                showDrop ? 'h-2 bg-muted opacity-100' : 'h-1 opacity-0',
            )}
            onDragEnter={() => setShowDrop(true)}
            onDragLeave={() => setShowDrop(false)}
            onDrop={() => {
                onDrop();
                setShowDrop(false);
            }}
            onDragOver={(e) => e.preventDefault()}
        >
            Drop Me
        </section>
    )
}

export default DropArea
