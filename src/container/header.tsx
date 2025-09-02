import React from 'react'

const Header = () => {
    return (
        <header className="mb-4 md:mb-6">
            <h1 className="text-pretty text-2xl md:text-3xl font-semibold tracking-tight">Mini AI Studio — Chat</h1>
            <p className="text-sm text-muted-foreground">Upload image → choose style → Generate (mocked).</p>
        </header>
    )
}

export default Header