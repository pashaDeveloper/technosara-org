import Container from "../shared/Container";
import Image from "next/image";
import Link from "next/link";
import { AiTwotoneFire } from "react-icons/ai";

export default function Banner2({ className }) {
  return (
    <Container className={className || ""}>
      <section aria-label="Call of Duty: Modern Warfare 4" className="relative isolate flex min-h-[440px] w-full flex-col gap-y-8 rounded-primary bg-[linear-gradient(264deg,_#263c27,_#9b9239)] py-8 overflow-visible [clip-path:inset(0_-16px_0_0)] md:overflow-hidden md:[clip-path:none] lg:min-h-[480px] lg:overflow-visible lg:[clip-path:inset(-100%_0_0_0)] lg:p-24">
        <Image src="/assets/home/banner/MWF.png" alt="سرباز Modern Warfare 4" height={1080} width={646} sizes="(max-width: 767px) 100vw, 500px" className="pointer-events-none absolute inset-y-0 left-0 h-full w-[calc(100%+16px)] max-w-none object-cover object-top md:inset-auto md:bottom-0 md:right-0 md:h-auto md:w-[400px] md:max-w-full md:object-contain lg:h-[620px] lg:w-auto" />
        <article className="relative z-10 flex flex-col items-end justify-start px-8">
          <div className="mr-auto flex w-full min-w-0 max-w-lg flex-col gap-y-4 sm:max-w-3xl sm:[container-type:inline-size]">
            <h2 dir="ltr" className="w-full text-[clamp(2.5rem,12vw,4.5rem)] font-black leading-none text-white drop-shadow-md sm:text-[9cqw] sm:leading-tight">
              <span className="block text-left text-white">Call of Duty</span>
              <span className="block text-center text-white sm:text-left lg:inline">Modern</span>{" "}
              <span className="block text-right text-white sm:text-left lg:inline">Warfare <span className="text-yellow-400 lg:inline">4</span></span>
            </h2>
            <Link href="/games?genre=shooter" dir="rtl" className="mr-0 ml-auto md:mr-auto md:ml-0 flex w-fit max-w-full items-center gap-x-2 rounded-secondary border border-black bg-black px-3 py-1.5 text-sm text-white drop-shadow transition-colors hover:bg-black/90 sm:px-4 sm:py-2 sm:text-base">
              برای نبرد بعدی آماده‌ای؟
              <AiTwotoneFire className="h-6 w-6 text-yellow-400" />
            </Link>
          </div>
        </article>
      </section>
    </Container>
  );
}
