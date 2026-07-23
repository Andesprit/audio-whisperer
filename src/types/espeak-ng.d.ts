declare module "espeak-ng" {
  interface ESpeakFileSystem {
    readFile(path: string, options: { encoding: "utf8" }): string;
  }

  interface ESpeakInstance {
    FS: ESpeakFileSystem;
  }

  export default function ESpeakNg(options: {
    arguments: string[];
  }): Promise<ESpeakInstance>;
}
