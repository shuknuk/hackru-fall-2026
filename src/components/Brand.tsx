import Image from "next/image";
import Link from "next/link";

export default function Brand() {
  return (
    <Link className="brand" href="/" aria-label="SpotOn home">
      <Image
        className="brand-mark"
        src="/icons/spoton-s-mark.png"
        alt=""
        width={28}
        height={28}
        priority
      />
      <span>SpotOn</span>
    </Link>
  );
}
