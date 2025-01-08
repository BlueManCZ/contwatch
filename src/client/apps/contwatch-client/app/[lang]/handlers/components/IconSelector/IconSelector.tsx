import * as fs from "node:fs";

import { Icon, type IconProps } from "@repo/ui/Icon";

export const IconSelector = () => {
    const icons = fs.readdirSync("public/icons").map((file) => file.replace(".svg", "") as IconProps["icon"]);

    return (
        <div>
            {icons.map((icon) => (
                <div key={icon}>
                    <Icon icon={icon} />
                </div>
            ))}
        </div>
    );
};
