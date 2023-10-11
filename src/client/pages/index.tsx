import { NextPage } from "next";
import router from "next/router";
import { useEffect } from "react";

const Index: NextPage = () => {
    useEffect(() => {
        router.push("/dashboard");
    }, []);

    return <></>;
};

export default Index;
