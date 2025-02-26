import { FC, SVGProps } from "react";

const RightSidebar: FC<SVGProps<SVGElement>> = (props) => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    width="24"
    height="24"
    fill="none"
    stroke="currentColor"
    strokeLinecap="round"
    strokeLinejoin="round"
    strokeWidth="2"
    className="lucide lucide-panel-right"
    viewBox="0 0 24 24"
    style={{ ...props.style }}
  >
    <rect width="18" height="18" x="3" y="3" rx="2"></rect>
    <path d="M15 3v18"></path>
  </svg>
);

export default RightSidebar;
