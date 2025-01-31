import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { FileText, Download, Image, FileArchive, Trash2 } from "lucide-react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import type { Document } from "@/lib/types";

interface DocumentViewerProps {
  documents: Document[];
  readOnly?: boolean;
}

const getDocumentIcon = (type: string) => {
  switch (type) {
    case 'photo':
      return <Image className="h-4 w-4" />;
    case 'certificate':
      return <FileText className="h-4 w-4" />;
    default:
      return <FileArchive className="h-4 w-4" />;
  }
};

export default function DocumentViewer({ documents, readOnly = false }: DocumentViewerProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const deleteMutation = useMutation({
    mutationFn: async (documentId: number) => {
      const res = await fetch(`/api/documents/${documentId}`, {
        method: "DELETE",
      });
      if (!res.ok) throw new Error("Failed to delete document");
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/family-members"] });
      toast({
        title: "Document deleted",
        description: "The document has been removed successfully",
      });
    },
  });

  const handleDownload = (fileUrl: string, title: string) => {
    const link = document.createElement('a');
    link.href = fileUrl;
    link.download = title;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  if (!documents.length) {
    return (
      <div className="text-center py-8 text-muted-foreground">
        No documents available.
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {documents.map((doc) => (
        <Card key={doc.id} className="hover:shadow-md transition-shadow">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-3">
                {getDocumentIcon(doc.documentType)}
                <div>
                  <h4 className="font-medium">{doc.title}</h4>
                  <p className="text-sm text-muted-foreground">
                    {doc.description || 'No description'}
                  </p>
                </div>
              </div>
              <div className="flex space-x-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => window.open(doc.fileUrl, '_blank')}
                >
                  View
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handleDownload(doc.fileUrl, doc.title)}
                >
                  <Download className="h-4 w-4" />
                </Button>
                {!readOnly && (
                  <Button
                    variant="destructive"
                    size="sm"
                    onClick={() => deleteMutation.mutate(doc.id)}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                )}
              </div>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}