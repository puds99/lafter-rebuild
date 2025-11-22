import { useEffect, useState } from 'react';
import { supabase } from '../../lib/supabase';

export function Footer() {
    const [isConnected, setIsConnected] = useState<boolean | null>(null);

    useEffect(() => {
        const checkConnection = async () => {
            try {
                // Just checking if we can talk to the auth service
                const { error } = await supabase.auth.getSession();
                if (error) throw error;
                setIsConnected(true);
            } catch (err) {
                console.error('Supabase connection check failed:', err);
                setIsConnected(false);
            }
        };

        checkConnection();
    }, []);

    return (
        <footer className="bg-gray-50 border-t border-gray-200 mt-auto">
            <div className="max-w-7xl mx-auto py-6 px-4 sm:px-6 lg:px-8 flex justify-between items-center">
                <p className="text-sm text-gray-500">
                    &copy; {new Date().getFullYear()} Lafter.org. All rights reserved.
                </p>
                <div className="flex items-center space-x-2" title={isConnected ? "Connected to Supabase" : "Connection Error"}>
                    <span className="text-xs text-gray-400">System Status:</span>
                    <div className={`h-2.5 w-2.5 rounded-full ${isConnected === null ? 'bg-gray-300' : isConnected ? 'bg-green-500' : 'bg-red-500'}`}></div>
                </div>
            </div>
        </footer>
    );
}
