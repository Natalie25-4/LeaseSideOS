interface EmptyStateProps{
    title: string;
    description?: string;
    action?: React.ReactNode;
}

export function EmptyState({ title, description, action }: EmptyStateProps){
    return(
        <div className="flex flec-col items-center justify-center text-center py-16 px-4">
            <h3 className="text-charcoal font-medium">{title}</h3>
            {description && <p className="text-sm text-gray-500 mt-1 max-w-sm">{description}</p>}
            {action && <div className="mt-4">{action}</div>}
        </div>
    );
}