import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Download, Loader2, Database } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';

export default function BackupPage() {
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();

  const handleDownload = async () => {
    setLoading(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      
      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/export-database`,
        {
          headers: {
            'Authorization': `Bearer ${session?.access_token || import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}`,
            'apikey': import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY,
          },
        }
      );

      if (!response.ok) throw new Error('Export failed');

      const sql = await response.text();
      const blob = new Blob([sql], { type: 'application/sql' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `lekkside_backup_${new Date().toISOString().split('T')[0]}.sql`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);

      toast({ title: 'Backup downloaded', description: 'Your SQL backup file has been downloaded.' });
    } catch (error: any) {
      toast({ title: 'Export failed', description: error.message, variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4">
      <div className="text-center space-y-6 max-w-md">
        <Database className="w-16 h-16 mx-auto text-primary" />
        <h1 className="text-2xl font-bold">Database Backup</h1>
        <p className="text-muted-foreground">
          Download a complete SQL backup of your database including schema, functions, RLS policies, and all data ({'>'}7,200 guests).
        </p>
        <Button onClick={handleDownload} disabled={loading} size="lg" className="w-full">
          {loading ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Download className="w-4 h-4 mr-2" />}
          {loading ? 'Generating backup...' : 'Download SQL Backup'}
        </Button>
        <p className="text-xs text-muted-foreground">
          You can run this .sql file on any PostgreSQL database to restore your data.
        </p>
      </div>
    </div>
  );
}
