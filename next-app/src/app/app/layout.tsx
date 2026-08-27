import ClerkWrapper from "@/components/ClerkWrapper";

export default function AppSectionLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return <ClerkWrapper>{children}</ClerkWrapper>;
}
