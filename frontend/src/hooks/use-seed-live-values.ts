import { useEffect } from "react";
import { useAllAttributeValuesApiAttributesValuesGet } from "@/api/generated/attributes/attributes";
import { useLiveValuesStore } from "@/stores/live-values";

export function useSeedLiveValues() {
    const { data } = useAllAttributeValuesApiAttributesValuesGet();
    const bulkSetValues = useLiveValuesStore((s) => s.bulkSetValues);

    useEffect(() => {
        if (data?.data) {
            bulkSetValues(data.data);
        }
    }, [data, bulkSetValues]);
}
