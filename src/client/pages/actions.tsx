import { FlumeConfig, NodeEditor, NodeMap, PortType, PortTypeConfig } from "flume";
import { NextPage } from "next";
import { useEffect, useState } from "react";

import { fetchNodeMap, saveNodeMap, useAvailableNodes, useAvailablePorts } from "../src/bridge";
import { NodeModel } from "../src/bridge/modules/actions/models";
import { ThemedIconName, Toolbar } from "../src/components";
import { NavbarLayout } from "../src/layouts";
import { LOC_KEY, useLocalization } from "../src/localization";

const addPorts = (config: FlumeConfig, availablePorts: PortTypeConfig[]) => {
    availablePorts.forEach((port) => {
        config.addPortType(port);
    });
};

const addNodes = (config: FlumeConfig, availableNodes: NodeModel[]) => {
    availableNodes.forEach((node) => {
        config.addNodeType({
            type: node.type,
            label: node.label,
            description: node.description,
            // @ts-ignore flume types don't like this, but it's fine
            inputs: (ports) => {
                if (node.repeatableInput) {
                    return (inputData, connections) => {
                        const result: PortType[] = [];
                        const repeatableInput = node.inputs.find(
                            (input) => input.name === node.repeatableInput,
                        );
                        let maximumIndex = -1;
                        node.inputs.forEach((input) => {
                            if (input.name !== node.repeatableInput) {
                                result.push(ports[input.type](input));
                            } else {
                                Object.keys(connections.inputs).forEach((name) => {
                                    result.push(
                                        ports[input.type]({
                                            ...input,
                                            name: name,
                                        }),
                                    );
                                    maximumIndex = Math.max(maximumIndex, parseInt(name.split("##")[1]));
                                });
                            }
                        });
                        result.push(
                            ports[repeatableInput?.type ?? ""]({
                                ...repeatableInput,
                                name: (repeatableInput?.name ?? "") + "##" + (maximumIndex + 1),
                            }),
                        );
                        return result;
                    };
                } else {
                    return node.inputs?.map((port) => ports[port.type](port)) ?? [];
                }
            },
            outputs: (ports) => node.outputs?.map((port) => ports[port.type](port)) ?? [],
        });
    });
};

const Actions: NextPage = () => {
    const { localize } = useLocalization();
    const { data: availablePorts } = useAvailablePorts();
    const { data: availableNodes } = useAvailableNodes();

    const [config, setConfig] = useState<FlumeConfig | null>(null);
    const [nodeMap, setNodeMap] = useState<NodeMap | null>(null);

    const saveNodeMapOnServer = (nodeMap: NodeMap) => {
        if (Object.keys(nodeMap).length > 0) {
            saveNodeMap(nodeMap);
        }
    };

    useEffect(() => {
        if (availableNodes && availablePorts) {
            const config = new FlumeConfig();
            availablePorts && addPorts(config, availablePorts);
            availableNodes && addNodes(config, availableNodes);
            setConfig(config);
        }
    }, [availableNodes, availablePorts]);

    useEffect(() => {
        fetchNodeMap().then((nodeMap) => {
            setNodeMap(nodeMap);
        });
    }, []);

    return (
        <NavbarLayout>
            <Toolbar
                icon={ThemedIconName.branchHorizontal}
                title={localize(LOC_KEY.ACTIONS)}
                description={localize(LOC_KEY.ACTIONS_INFO)}
            />
            <div style={{ flexGrow: 1 }}>
                {config && nodeMap && (
                    <NodeEditor
                        nodes={nodeMap}
                        onChange={saveNodeMapOnServer}
                        portTypes={config.portTypes}
                        nodeTypes={config.nodeTypes}
                    />
                )}
            </div>
        </NavbarLayout>
    );
};

export default Actions;
