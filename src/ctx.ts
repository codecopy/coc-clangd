import { Executable, ExtensionContext, LanguageClient, LanguageClientOptions, ServerOptions, services, workspace } from 'coc.nvim';
import { existsSync } from 'fs';
import which from 'which';
import { Config } from './config';

export class Ctx {
  public readonly config: Config;
  client: LanguageClient | null = null;

  constructor(private readonly context: ExtensionContext) {
    this.config = new Config();
  }

  resolveBin(): string | undefined {
    const bin = which.sync(this.config.path, { nothrow: true });
    if (!bin) {
      return;
    }

    if (!existsSync(bin)) {
      return;
    }

    return bin;
  }

  async startServer(bin: string) {
    const old = this.client;
    if (old) {
      await old.stop();
    }

    const exec: Executable = {
      command: bin,
      args: this.config.arguments
    };

    const serverOptions: ServerOptions = exec;
    const outputChannel = workspace.createOutputChannel('clangd trace');

    const cudaFilePattern = '**/*.{cu}';
    const clientOptions: LanguageClientOptions = {
      documentSelector: [
        { scheme: 'file', language: 'c' },
        { scheme: 'file', language: 'cpp' },
        { scheme: 'file', language: 'objective-c' },
        { scheme: 'file', language: 'objective-cpp' },
        { scheme: 'file', pattern: cudaFilePattern }
      ],
      initializationOptions: { clangdFileStatus: true },
      outputChannel
      // revealOutputChannelOn: RevealOutputChannelOn.Never
    };

    const client = new LanguageClient('clangd Language Server', serverOptions, clientOptions);
    if (this.config.semanticHighlighting) {
      // const semanticHighlightingFeature = new semanticHighlighting.SemanticHighlightingFeature(clangdClient, context);
      // context.subscriptions.push(vscode.Disposable.from(semanticHighlightingFeature));
      // clangdClient.registerFeature(semanticHighlightingFeature);
    }

    this.context.subscriptions.push(client.start());
    this.context.subscriptions.push(services.registLanguageClient(client));
    await client.onReady();

    this.client = client;
  }
}