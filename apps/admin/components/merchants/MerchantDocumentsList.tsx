import type { MerchantApplicationSummary } from '@/lib/api-client';
import { Card, CardContent, CardHeader, CardTitle } from '@allgo/ui';
import { Badge } from '@allgo/ui';
import { Button } from '@allgo/ui';
import type React from 'react';

interface MerchantDocumentsListProps {
  merchant: MerchantApplicationSummary;
}

export const MerchantDocumentsList: React.FC<MerchantDocumentsListProps> = ({ merchant }) => {
  const documents = (merchant as any).documents || [];

  return (
    <Card className="mb-6">
      <CardHeader>
        <CardTitle className="text-base">KYC & Regulatory Documents</CardTitle>
      </CardHeader>
      <CardContent>
        {documents.length > 0 ? (
          <div className="space-y-3">
            {documents.map((doc: any) => (
              <div
                key={doc.id}
                className="flex justify-between items-center p-3 rounded-lg border border-border bg-muted/40"
              >
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-semibold text-sm text-foreground">
                      {doc.document_type}
                    </span>
                    <Badge variant="outline" className="text-xs">
                      v{doc.version || 1}
                    </Badge>
                    <Badge variant={doc.is_current ? 'default' : 'secondary'} className="text-xs">
                      {doc.is_current ? 'Current' : 'Superseded'}
                    </Badge>
                  </div>
                  <div className="text-xs text-muted-foreground mt-0.5">
                    Document #: {doc.document_number || 'N/A'} • Status:{' '}
                    {doc.verification_status || 'PENDING'}
                  </div>
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  render={
                    <a
                      href={`/v1/storage/documents/${doc.storage_key || doc.id}`}
                      target="_blank"
                      rel="noreferrer"
                    />
                  }
                >
                  Download / Verify
                </Button>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-sm text-muted-foreground">
            No binary documents submitted yet for this merchant profile.
          </p>
        )}
      </CardContent>
    </Card>
  );
};
