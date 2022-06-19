import { ChildProcess, execFile, ExecFileException } from "child_process";
import { existsSync, mkdirSync } from "fs";
import path = require("path");
import { OutputChannel, ProgressLocation, window, workspace } from "vscode";
import { workspaceState } from "./extension";

export function dockerExec(
    command: string[],
    channelTitle: string,
    progressTitle: string = "Working",
    doneTitle: string = "Done!"
    ){
        
    const workspaceFolder = getWorkspaceFolder();

    if (!workspaceFolder){
        return window.showErrorMessage("No workspace folder open");
    }

    const args = [
        "run",
        "--rm",
        "-v",
        `${workspaceFolder}:/project`,
        "benstobbs/litex-runner:latest"
    ]
    .concat(command);

    return window.withProgress({
        location: ProgressLocation.Notification,
        title: progressTitle,
        cancellable: false
    }, () => {	
        const p = new Promise<void>(resolve => {
            const childProcess = execFile("docker", args, {maxBuffer: 100 * 1024 * 1024}, (error: ExecFileException | null) => {
                if (error){
                    window.showErrorMessage(error.message);
                }
                else{
                    window.showInformationMessage(doneTitle);
                }
                resolve();
            });

            displayOutput(childProcess, channelTitle);
            
            return childProcess;
        });
        return p;
    });
}

export function getPersistentOutputChannel(channelName: string){
    var channel: (OutputChannel | undefined) = workspaceState.get(channelName);

    const validChannel = channel && (channel.append !== undefined) && (channel.show !== undefined);
    
    if (!channel || !validChannel){
        channel = window.createOutputChannel(channelName);
        workspaceState.update(channelName, channel);
    }

    return channel;
}

export function displayOutput(childProcess: ChildProcess, outputChannelName: string){			
    const outputChannel = getPersistentOutputChannel(outputChannelName);
    outputChannel.show(true);

    if (childProcess.stdout){
        childProcess.stdout.on("data", (chunk) => {
            outputChannel.append(chunk);
        });
    }

    if (childProcess.stderr){
        childProcess.stderr.on("data", (chunk) => {
            outputChannel.append(chunk);
        })
    }

    return outputChannel;
}

export function getWorkspaceFolder(){
    const workspaceFolders = workspace.workspaceFolders;

    if (!workspaceFolders){
        return undefined;
    }

    return removeLeadingSlash(workspaceFolders[0].uri.path);
}

export function removeLeadingSlash(path: string){
    // \c:\... --> c:\...
    if (process.platform === "win32" && (path[0] === "\\" || path[0] == "/")){
        return path.slice(1);
    }
    return path;
}

export function getBuildFolder() {
    var workspacePath = getWorkspaceFolder();

    if (!workspacePath){
        return undefined;
    }

	var buildFolder = path.join(workspacePath, "build");

    buildFolder = removeLeadingSlash(buildFolder);

    if (!existsSync(buildFolder)){
        mkdirSync(buildFolder);
    }

    return buildFolder;
}