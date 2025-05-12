
import type { ResourceFile } from '@/lib/types';
import { Button } from '@/components/ui/button';
import { Download, FileText } from 'lucide-react';

interface ResourceListProps {
  resources: ResourceFile[];
}

const ResourceList = ({ resources }: ResourceListProps) => {
  if (!resources || resources.length === 0) {
    return null;
  }

  return (
    <div className="mt-6">
      <h4 className="text-md font-semibold mb-3 text-foreground">Downloadable Resources</h4>
      <ul className="space-y-2">
        {resources.map((resource) => (
          <li key={resource.id} className="flex items-center justify-between p-3 bg-secondary/50 rounded-md">
            <div className="flex items-center">
              <FileText className="h-5 w-5 mr-2 text-primary" />
              <span className="text-sm text-foreground">{resource.name}</span>
              {resource.fileType && <span className="ml-2 text-xs text-muted-foreground">({resource.fileType})</span>}
            </div>
            <Button variant="outline" size="sm" asChild>
              <a href={resource.url} download target="_blank" rel="noopener noreferrer">
                <Download className="h-4 w-4 mr-1" /> Download
              </a>
            </Button>
          </li>
        ))}
      </ul>
    </div>
  );
};

export default ResourceList;