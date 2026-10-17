import React, { useSyncExternalStore } from "react";
import ReactJson from "react18-json-view";
import "react18-json-view/src/style.css";
import "react18-json-view/src/dark.css";
import { getConfig, subscribeConfig } from "./config";
import { isDarkTheme, subscribeSkinDark } from "./theme";

const JSONViewer = ({ json }: { json: object }) => {
    const config = useSyncExternalStore(subscribeConfig, getConfig);
    const skinDark = useSyncExternalStore(subscribeSkinDark, isDarkTheme);

    // 仅当 dark 显式设为 true 时强制暗色，其余情况由皮肤探测决定
    const dark = config.dark === true || skinDark;

    return (
        <ReactJson
            src={json}
            displaySize
            collapseStringMode="word"
            collapseStringsAfterLength={150}
            theme={config.theme}
            dark={dark}
        />
    );
};

export default JSONViewer;
