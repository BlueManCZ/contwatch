import { NextPage } from "next";
import { useRouter } from "next/navigation";
import { useEffect } from "react";

const Index: NextPage = () => {
    const router = useRouter();
    useEffect(() => {
        router.push("/dashboard");
    }, [router]);

    return <></>;
};

export default Index;
