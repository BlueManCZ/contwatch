import { PageRenderer } from "./components/PageRenderer/PageRenderer";

export default async function Handlers({ params }: { params: Promise<{ id: number }> }) {
    return <PageRenderer handlerId={(await params).id} />;
}
