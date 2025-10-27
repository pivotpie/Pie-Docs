import { useSearchParams } from 'react-router-dom';
import DocumentLibrary from './DocumentLibrary';
import NewDocumentLibrary from './NewDocumentLibrary';
import SimpleUploadTest from '@/components/testing/SimpleUploadTest';

const DocumentsPage = () => {
  const [searchParams] = useSearchParams();
  const openUpload = searchParams.get('upload') === 'true';
  const showTest = searchParams.get('test') === 'true';

  // Show test component if test=true is in URL
  if (showTest) {
    return <SimpleUploadTest />;
  }

  return <DocumentLibrary openUpload={openUpload} />;
}

export default DocumentsPage