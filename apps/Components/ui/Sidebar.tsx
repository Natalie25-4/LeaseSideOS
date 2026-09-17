interface NavItem{
    label: string;
    href: string;
}

export function Sidebar ({ items, activeHref}: {items: NavItem[], activeHref: string}){
    return(
        <nav className="w-56 border-r border-border h-full py-6 px-3 flex flex-col gap-1">
            {items.map((item) => (
                <a
                    key={item.href}
                    href={item.href}
                    className={`px-3 py-2 rounded-md text-sm font-medium transition-colours ${
                        item.href === activeHref ? "bg-blue-50 text-primary" : "text-charcoal hover:bg-gray-50"
                    }`}
                >
                    {item.label}
                </a>
            ))}
        </nav>
    );
}