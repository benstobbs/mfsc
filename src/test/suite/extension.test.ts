import * as assert from 'assert';
import path = require('path');
import { existsSync, mkdirSync } from 'fs';

// You can import and use all API from the 'vscode' module
// as well as import your extension to test it
import * as vscode from 'vscode';

async function openTestFolder() {
	const testProjectFolder = path.resolve("extension_test_project");

	if (!existsSync(testProjectFolder)){
		mkdirSync(testProjectFolder);
	}
	
	let uri = vscode.Uri.file(testProjectFolder);
	await vscode.commands.executeCommand('vscode.openFolder', uri);

	return testProjectFolder;
}

suite('Extension Test Suite', () => {
	vscode.window.showInformationMessage('Start all tests.');

	test('Run Create Project Command', async () => {
		const testProjectFolder = await openTestFolder();

		return vscode.commands.executeCommand("mfsc.createProject").then(() => {
			const files = ["main.c", "isr.c", "linker.ld", "Makefile"];

			files.forEach((file) => {
				assert.strictEqual(existsSync(path.join(testProjectFolder, file)), true);
			});
		});
	});

	test('Run Build SoC Command', async () => {
		const testProjectFolder = await openTestFolder();
		
		return vscode.commands.executeCommand("mfsc.compileSoC").then(() => {
			assert.strictEqual(existsSync(path.join(testProjectFolder, "build", "gateware", "gsd_orangecrab.bit")), true);
		});
	});

	test('Run Compile C Code Command', async () => {
		const testProjectFolder = await openTestFolder();

		return vscode.commands.executeCommand('mfsc.compileCode')
		.then(() => {
			assert.strictEqual(existsSync(path.join(testProjectFolder, "program.bin")), true);
		});
	});
});
