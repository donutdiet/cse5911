import Image from "next/image";

export function WelcomeSkeletons() {
  return (
    <div className="w-full max-w-2xl">
      <Image
        src="/Skeletons.jpeg"
        alt="Four cartoon skeletons cheering with pom-poms"
        width={1140}
        height={360}
        priority
        className="h-auto w-full select-none"
      />
    </div>
  );
}
