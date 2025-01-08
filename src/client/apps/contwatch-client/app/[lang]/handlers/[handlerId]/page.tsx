import { PageRenderer } from "./components/PageRenderer/PageRenderer";

export default async function Handlers({ params }: { params: Promise<{ handlerId: number }> }) {
    return <PageRenderer handlerId={(await params).handlerId} />;
}
