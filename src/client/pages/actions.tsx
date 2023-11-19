import { Controls, FlumeConfig, NodeEditor } from "flume";
import { NextPage } from "next";
import { useEffect, useState } from "react";

import { useAvailableNodes, useAvailablePorts } from "../src/bridge";
import { NodeModel, PortModel } from "../src/bridge/modules/actions/models";
import { ThemedIconName, Toolbar } from "../src/components";
import { NavbarLayout } from "../src/layouts";
import { LOC_KEY, useLocalization } from "../src/localization";

const addPorts = (config: FlumeConfig, availablePorts: PortModel[]) => {
    availablePorts.forEach((port) => {
        config.addPortType({
            type: port.type,
            name: port.name,
            label: port.label,
            hidePort: port.hidePort,
            // color: port.color,
            controls: port.controls
                .map((control) =>
                    Controls[control.type]({
                        name: control.name,
                        label: control.name,
                        options: control.options,
                    }),
                )
                .filter((c) => c !== null),
        });
    });
};

const addNodes = (config: FlumeConfig, availableNodes: NodeModel[]) => {
    availableNodes.forEach((node) => {
        config.addNodeType({
            type: node.type,
            label: node.label,
            description: node.description,
            inputs: (ports) => node.inputs?.map((port) => ports[port]()) ?? [],
            outputs: (ports) => node.outputs?.map((port) => ports[port]()) ?? [],
        });
    });
};

const Actions: NextPage = () => {
    const { localize } = useLocalization();
    const { data: availablePorts } = useAvailablePorts();
    const { data: availableNodes } = useAvailableNodes();

    const [config, setConfig] = useState<FlumeConfig | null>(null);

    useEffect(() => {
        if (availableNodes && availablePorts) {
            const config = new FlumeConfig();
            availablePorts && addPorts(config, availablePorts);
            availableNodes && addNodes(config, availableNodes);
            setConfig(config);
        }
    }, [availableNodes, availablePorts]);

    console.log(config);

    return (
        <NavbarLayout>
            <Toolbar
                icon={ThemedIconName.branchHorizontal}
                title={localize(LOC_KEY.ACTIONS)}
                description={localize(LOC_KEY.ACTIONS_INFO)}
            />
            <div style={{ flexGrow: 1 }}>
                {config && (
                    <NodeEditor
                        onChange={(nodes) => console.log(nodes)}
                        portTypes={config.portTypes}
                        nodeTypes={config.nodeTypes}
                    />
                )}
            </div>
        </NavbarLayout>
    );
};

export default Actions;
