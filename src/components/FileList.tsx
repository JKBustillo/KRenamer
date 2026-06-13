import type { FileEntry } from "../types/fileEntry";
import "./FileList.css";

interface FileListProps {
  files: FileEntry[];
}

/** Lista simple de los archivos cargados, en orden natural. */
export function FileList({ files }: FileListProps) {
  return (
    <div className="file-list">
      <div className="file-list__head">
        <span className="file-list__count">{files.length}</span>
        <span className="file-list__label">
          {files.length === 1 ? "archivo cargado" : "archivos cargados"}
        </span>
      </div>
      <ol className="file-list__items">
        {files.map((file, index) => (
          <li className="file-list__item" key={file.path}>
            <span className="file-list__index">{index + 1}</span>
            <span className="file-list__name">{file.name}</span>
          </li>
        ))}
      </ol>
    </div>
  );
}
