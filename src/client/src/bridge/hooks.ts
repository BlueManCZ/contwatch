import { useEffect, useState } from "react";

export const useQuery = (text: string, offset: number = 1) => {
    const [queryString, setQueryString] = useState("");

    useEffect(() => {
        if (text.length > offset) {
            setQueryString(text);
        } else if (text.length === 0) {
            setQueryString("");
        } else if (!queryString.startsWith(text)) {
            setQueryString("");
        }
    }, [text, queryString, offset]);

    return queryString;
};
