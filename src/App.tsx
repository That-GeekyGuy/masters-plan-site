import { useEffect, useState, type FormEvent, type ReactNode } from "react";

/**
 * NOT real security. This is a client-side deterrent only — the hash below
 * ships in the JS bundle and anyone who reads it can brute-force or bypass
 * it. It exists so this page doesn't read as plain content to a casual
 * visitor or a search crawler (see the noindex meta in index.html), nothing
 * more. This repo should stay private on GitHub — that's the actual
 * boundary; this gate is a second, weaker layer on top of it.
 *
 * To change the password: run in a browser console —
 *   crypto.subtle.digest("SHA-256", new TextEncoder().encode("your-new-password"))
 *     .then(b => console.log(Array.from(new Uint8Array(b)).map(x => x.toString(16).padStart(2,"0")).join("")))
 * and paste the result below.
 */
const PASSWORD_HASH = "748e153e1f6bf667317b120745a4ebb6788459b4b801c19f54de50c76da555e0";
const STORAGE_KEY = "ops-masters-plan-unlocked";

async function sha256Hex(input: string): Promise<string> {
  const buf = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(input));
  return Array.from(new Uint8Array(buf))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

export default function App() {
  const [unlocked, setUnlocked] = useState(false);
  const [checked, setChecked] = useState(false);

  useEffect(() => {
    setUnlocked(window.localStorage.getItem(STORAGE_KEY) === "1");
    setChecked(true);
  }, []);

  if (!checked) return null;
  if (!unlocked) return <PasswordForm onUnlock={() => setUnlocked(true)} />;
  return <MastersPlanPage />;
}

function PasswordForm({ onUnlock }: { onUnlock: () => void }) {
  const [value, setValue] = useState("");
  const [error, setError] = useState(false);
  const [busy, setBusy] = useState(false);

  const onSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setBusy(true);
    const hash = await sha256Hex(value);
    setBusy(false);
    if (hash === PASSWORD_HASH) {
      window.localStorage.setItem(STORAGE_KEY, "1");
      onUnlock();
    } else {
      setError(true);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <div className="pcb-grid pointer-events-none fixed inset-0 z-0 opacity-40" aria-hidden />
      <form onSubmit={onSubmit} className="surface-panel relative z-10 w-full max-w-sm p-6 md:p-8">
        <p className="mono-label text-primary">// RESTRICTED_NODE</p>
        <h1 className="mt-3 font-display text-2xl font-bold tracking-tight text-foreground">
          Access gated.
        </h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Enter the key to continue.
        </p>
        <input
          type="password"
          autoFocus
          value={value}
          onChange={(e) => {
            setValue(e.target.value);
            setError(false);
          }}
          className="mt-5 w-full border border-border bg-background px-3 py-2.5 font-mono text-sm text-foreground outline-none focus-visible:border-primary/60"
          placeholder="passphrase"
        />
        {error && (
          <p className="mt-2 font-mono text-xs uppercase tracking-widest text-amber">
            No match. Try again.
          </p>
        )}
        <button
          type="submit"
          disabled={busy}
          className="mt-4 inline-flex w-full items-center justify-center gap-2 bg-primary px-5 py-2.5 font-mono text-xs font-bold uppercase tracking-[0.2em] text-primary-foreground transition-transform active:scale-95 disabled:opacity-60"
        >
          {busy ? "Verifying…" : "Unlock"}
        </button>
      </form>
    </div>
  );
}

/* ================= content ================= */

const SECTIONS: { id: string; code: string; label: string }[] = [
  { id: "gap", code: "00", label: "Confidence gap" },
  { id: "q00", code: "Q0", label: "Master vs. job" },
  { id: "shortlist", code: "SL", label: "Shortlist" },
  { id: "fulllist", code: "FL", label: "Full list" },
  { id: "contacts", code: "CE", label: "Cold email" },
  { id: "roadmap", code: "RM", label: "Roadmap" },
  { id: "altpath", code: "AP", label: "Alt. path" },
];

function JumpNav() {
  const scrollTo = (id: string) => {
    document.getElementById(id)?.scrollIntoView({ block: "start" });
  };
  return (
    <nav
      aria-label="Section jump nav"
      className="sticky top-0 z-20 -mx-4 border-b border-border bg-background/90 px-4 backdrop-blur sm:mx-0 sm:px-0"
    >
      <div className="container-tight">
        <ul className="flex gap-1.5 overflow-x-auto py-2.5 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
          {SECTIONS.map((s) => (
            <li key={s.id} className="shrink-0">
              <button
                type="button"
                onClick={() => scrollTo(s.id)}
                className="mono-label flex items-center gap-1.5 whitespace-nowrap border border-border px-2.5 py-1 text-foreground transition-colors hover:border-primary/60 hover:text-primary"
              >
                <span className="text-primary">{s.code}</span>
                {s.label}
              </button>
            </li>
          ))}
        </ul>
      </div>
    </nav>
  );
}

function MastersPlanPage() {
  return (
    <div className="relative min-h-screen bg-background text-foreground">
      <div className="pcb-grid pointer-events-none fixed inset-0 z-0 opacity-30" aria-hidden />
      <JumpNav />
      <main className="container-tight relative z-10 max-w-4xl space-y-20 py-20 md:py-28">
        <header>
          <p className="mono-label text-primary">// OPS_LOG · MASTERS_PLAN · REV_4</p>
          <h1 className="mt-4 font-display text-4xl font-bold tracking-tighter text-foreground md:text-6xl">
            Masters Abroad &amp; the Standout-Candidate Plan
          </h1>
          <p className="mt-4 max-w-2xl text-base leading-relaxed text-muted-foreground md:text-lg">
            The full working plan: the resume-confidence gap, master-vs-job, a 58-university
            survey balanced for prestige and mobility with an EU lean, who to cold email, and a
            roadmap honest about what daily planning two years out can and can&apos;t do.
          </p>
          <div className="mono-label mt-6 flex flex-wrap gap-6 border-y border-border py-3">
            <span>UPDATED 14 JUL 2026</span>
            <span>58 UNIVERSITIES</span>
            <span className="text-primary">GOAL · WORK_ABROAD · EU_LEANING</span>
          </div>
        </header>

        <Block id="gap" eyebrow="PRIORITY_00" title="The resume-confidence gap comes first">
          <p>
            Your resume claims Go REST/gRPC and Docker/K8s/Helm work across two C-DOT internships
            and the UPF API Server project. You said you&apos;re not confident in either — and
            that resume is being used for Summer &apos;27 applications right now. If an interview
            goes two questions deep and the thread breaks, the resume is a liability, not an
            asset.
          </p>
          <p>
            Two different problems wear the same disguise: <b className="text-foreground">(1)</b>{" "}
            the knowledge is real but untrusted — fix by re-explaining it out loud until
            confidence catches up; <b className="text-foreground">(2)</b> a genuine gap where the
            work leaned on scaffolding more than independent understanding — fix by rebuilding
            from scratch. Budget for (2) until Phase 0&apos;s self-test says otherwise.
          </p>
        </Block>

        <Block id="q00" eyebrow="Q_00" title="Master vs. job — recap">
          <p>
            Master-first, weighted toward Canada and Germany over the US or Switzerland — your
            goal is working abroad, not the single most prestigious degree, and Canada/Germany
            turn a masters into a work permit without a lottery. Job-first (2–3 years at a company
            with India + abroad offices, then an internal transfer) remains a legitimate
            alternative — see the alternate path at the bottom.
          </p>
        </Block>

        <Block
          id="shortlist"
          eyebrow="SHORTLIST"
          title="The balanced shortlist — prestige + mobility, EU-leaning"
          note="Prestige weighted up per your call, especially in the EU — where it mostly doesn't fight mobility the way it does in the US/Switzerland."
        >
          <RankList
            items={[
              ["TU Darmstadt (CRISP)", "Germany", "Largest IT-security research institution in Europe — 30+ groups, 7 departments. Near-free, Blue Card path."],
              ["CISPA / Saarland", "Germany", "#1 CSRankings in security globally, ahead of CMU/ETH/Stanford. Near-free."],
              ["Ruhr Bochum (HGI)", "Germany", "36 professors, hosts CASA — Germany's only IT-security Cluster of Excellence."],
              ["ETH Zurich", "Switzerland", "Perrig, Capkun, Paterson, Shinde, Tramèr, Basin — the best single roster here. Swiss visa conversion is the real cost."],
              ["KIT (KASTEL)", "Germany", "Applied security + dependability, Karlsruhe tech corridor."],
              ["TUM", "Germany", "Eckert's Chair of IT Security, CISPA-linked since 2024."],
              ["EPFL", "Switzerland", "Joint MSc with ETH, own Security/Privacy/Crypto group."],
              ["KU Leuven (COSIC)", "Belgium", "Bart Preneel — world-class cryptography."],
              ["VU Amsterdam (VUSec)", "Netherlands", "Bos/Giuffrida — genuinely elite systems security."],
              ["Radboud University", "Netherlands", "Strong Digital Security group (Samardjiska, Schwabe)."],
              ["Télécom Paris", "France", "MS ECRSI ranked #1 Telecom & Networks (Eduniversal) — best direct fit on this list."],
              ["EURECOM", "France", "Explicit Mobile & Cloud Security track, deep telecom heritage."],
              ["KTH", "Sweden", "Papadimitratos (networked systems), Ekstedt (ICS/SCADA)."],
              ["Luxembourg (SnT)", "Luxembourg", "290 staff, 40 nationalities, center of the EU."],
              ["Twente", "Netherlands", "Solid applied cloud-security angle."],
            ]}
          />
          <p className="mt-4 text-sm text-muted-foreground">
            Non-EU fallback: Canada (Waterloo, Toronto) is still the strongest pure-mobility play;
            CMU/NYU Tandon the strongest pure-prestige US picks if the H-1B risk is acceptable.
          </p>
        </Block>

        <Block id="fulllist" eyebrow="FULL_LIST" title="Full list — 58 universities">
          <p className="mb-4">
            Grouped by region.{" "}
            <span className="border border-amber/30 bg-amber/10 px-1.5 py-0.5 font-mono text-[10px] uppercase text-amber">
              light
            </span>{" "}
            = credible but not individually re-verified this pass.
          </p>
          <RegionTable
            region="Germany &amp; Switzerland"
            rows={[
              ["TU Darmstadt", "DE", "CRISP — largest IT-security research institution in Europe"],
              ["Saarland / CISPA", "DE", "#1 CSRankings security globally"],
              ["Ruhr Bochum", "DE", "HGI, 36 professors, CASA Cluster of Excellence"],
              ["KIT", "DE", "KASTEL — Information Security and Dependability"],
              ["TUM", "DE", "Chair of IT Security (Eckert), CISPA-linked"],
              ["ETH Zurich", "CH", "Perrig / Capkun / Paterson / Shinde / Tramèr / Basin"],
              ["EPFL", "CH", "Joint program with ETH"],
            ]}
          />
          <RegionTable
            region="Benelux &amp; Luxembourg"
            rows={[
              ["KU Leuven", "BE", "COSIC (Preneel) + DistriNet"],
              ["VU Amsterdam", "NL", "VUSec — Bos, Giuffrida"],
              ["Radboud University", "NL", "Digital Security group, 100+ members"],
              ["University of Twente", "NL", "Cyber Security spec. within CS MSc"],
              ["TU Delft", "NL·light", "Strong general CS reputation"],
              ["Luxembourg (SnT)", "LU", "290 staff, 40 nationalities"],
            ]}
          />
          <RegionTable
            region="France &amp; Nordics"
            rows={[
              ["EURECOM", "FR", "Balzarotti, Francillon's S3 team"],
              ["Télécom Paris", "FR", "MS ECRSI ranked #1 Telecom & Networks"],
              ["Sorbonne Université", "FR", "RES — networks/cybersecurity/cloud"],
              ["KTH", "SE", "Papadimitratos, Ekstedt; hosts CDIS"],
              ["Chalmers", "SE", "Computer Systems and Cybersecurity MSc"],
              ["Linköping University", "SE", "Cybersecurity MSc, ethical-hacking lab"],
              ["Aalto University", "FI", "Leads the SECCLO Erasmus Mundus consortium"],
              ["NTNU", "NO", "Digital Infrastructure and Cyber Security MSc"],
              ["DTU", "DK", "Part of the CYBERSURE consortium"],
            ]}
          />
          <RegionTable
            region="UK &amp; Ireland"
            rows={[
              ["Royal Holloway", "UK", "Information Security Group — NCSC Gold Award"],
              ["University of Bristol", "UK", "Awais Rashid's group, ACE-CSR"],
              ["Imperial College London", "UK·light", "Practical/industry-linked security teaching"],
              ["UCL", "UK·light", "Interdisciplinary security programmes"],
              ["University of Oxford", "UK·light", "Dept. of Computer Science"],
              ["University of Cambridge", "UK·light", "Computer Lab security curriculum"],
              ["University of Birmingham", "UK·light", "Protocol/security verification research"],
              ["Trinity College Dublin", "IE", "MSc Future Networked Systems"],
              ["University College Dublin", "IE", "Anca Jurcut — malware/protocol security"],
              ["Dublin City University", "IE·light", "Irish Centre for Cyber Security"],
            ]}
          />
          <RegionTable
            region="Southern Europe &amp; Israel"
            rows={[
              ["Politecnico di Milano", "IT", "Cyber Risk, Strategy and Governance MSc"],
              ["Sapienza University of Rome", "IT", "Interdisciplinary Cybersecurity program"],
              ["IMDEA Software/Networks", "ES·light", "Elite Madrid research institutes"],
              ["Technion", "IL", "Fujiwara Cyber Security Research Center, Biham"],
              ["Tel Aviv University", "IL", "Blavatnik Interdisciplinary Cyber Research Center"],
              ["Ben-Gurion University", "IL", "Cyber Security Center"],
            ]}
          />
          <RegionTable
            region="North America"
            rows={[
              ["CMU (INI)", "US", "Deepest industry/govt pipeline surveyed"],
              ["UC San Diego", "US", "Stefan Savage — network/embedded security"],
              ["Purdue University", "US", "CERIAS — first US cybersecurity MS/PhD (2000)"],
              ["NYU Tandon", "US", "OSIRIS Lab runs CSAW"],
              ["Georgia Tech", "US", "On-campus + OMS online"],
              ["Johns Hopkins (ISI)", "US", "Strong applied/intel-adjacent placement"],
              ["UC Berkeley (MICS)", "US", "Online, rolling admissions"],
              ["Stanford", "US·light", "Broad, elite CS"],
              ["UIUC", "US·light", "Strong systems/security research"],
              ["University of Michigan", "US·light", "Strong security research presence"],
              ["University of Waterloo", "CA", "CPI, 70+ faculty across 16 depts"],
              ["University of Toronto", "CA", "MEng in Cyber Security"],
              ["UBC", "CA", "Master of Data Science, Cyber Security spec."],
              ["Concordia University", "CA", "CIISE — Information Systems Security"],
            ]}
          />
          <RegionTable
            region="Asia-Pacific"
            rows={[
              ["NUS", "SG", "Master of Computing, Infocomm Security"],
              ["NTU Singapore", "SG", "CYSREN + Cyber Security Lab"],
              ["HKUST", "HK", "Ding, Papadopoulos, Wang"],
              ["CUHK", "HK", "CSE cybersecurity research"],
              ["KAIST", "KR", "Graduate School of Information Security"],
              ["University of Tokyo", "JP·light", "Elite general CS"],
              ["UNSW / ADFA", "AU", "Largest security research concentration, S. Hemisphere"],
              ["Monash University", "AU", "ACS-accredited, #5 in Australia"],
              ["University of Melbourne", "AU", "Strong general CS/IT ranking"],
            ]}
          />
        </Block>

        <Block id="contacts" eyebrow="CONTACTS" title="Who to actually cold email">
          <p className="mb-4">19 names. Verify each lab page before writing — people move.</p>
          <div className="overflow-x-auto">
            <table className="w-full min-w-[560px] font-mono text-xs">
              <thead>
                <tr className="mono-label border-b border-border text-left">
                  <th className="py-2 pr-4">Professor</th>
                  <th className="py-2 pr-4">Institution</th>
                  <th className="py-2 pr-4">Focus</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border text-foreground">
                {[
                  ["Cas Cremers", "CISPA / Saarland", "Protocol verification"],
                  ["Ben Stock", "CISPA / Saarland", "Web/application security"],
                  ["Adrian Perrig", "ETH Zurich", "Network security, SCION"],
                  ["Srdjan Capkun", "ETH Zurich", "Wireless/physical-layer security"],
                  ["Shweta Shinde", "ETH Zurich", "Systems security, TEEs"],
                  ["Panagiotis Papadimitratos", "KTH", "Networked systems security"],
                  ["Mathias Ekstedt", "KTH", "SCADA/ICS security"],
                  ["Claudia Eckert", "TUM", "Malware, embedded systems"],
                  ["Aurélien Francillon", "EURECOM", "Wireless protocol attacks"],
                  ["Davide Balzarotti", "EURECOM", "Digital security, dept. head"],
                  ["Thorsten Holz", "Ruhr Bochum", "Malware/network security"],
                  ["Kevin Borgolte", "Ruhr Bochum", "Software security"],
                  ["Bart Preneel", "KU Leuven", "Cryptography — COSIC head"],
                  ["Simona Samardjiska", "Radboud", "Post-quantum crypto"],
                  ["Herbert Bos", "VU Amsterdam", "Systems security"],
                  ["Cristiano Giuffrida", "VU Amsterdam", "Hardware/systems security"],
                  ["Eli Biham", "Technion", "Cryptology/cryptanalysis"],
                  ["Stefan Savage", "UC San Diego", "Network/embedded security"],
                  ["Anca Jurcut", "UC Dublin", "Malware, protocol security"],
                ].map((row) => (
                  <tr key={row[0]}>
                    <td className="py-2 pr-4 font-semibold text-foreground">{row[0]}</td>
                    <td className="py-2 pr-4 text-muted-foreground">{row[1]}</td>
                    <td className="py-2 pr-4 text-muted-foreground">{row[2]}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Block>

        <Block id="roadmap" eyebrow="ROADMAP" title="The roadmap">
          <p>
            A literal daily calendar through Fall 2028 would be false precision. What&apos;s here
            instead: a real daily/weekly plan for the next 10 weeks, a repeatable weekly rhythm
            after that, and monthly/quarterly milestones for the full arc.
          </p>

          <h3 className="mt-8 font-display text-xl font-semibold text-foreground">
            Phase 0 — Foundation shoring (14 Jul – 30 Sep 2026)
          </h3>
          <div className="surface-panel mt-3 grid gap-px overflow-hidden bg-border sm:grid-cols-2">
            {[
              ["Mon/Wed/Fri", "1.5–2h Go rebuild: Tour of Go → Effective Go → one small idiomatic project/week with real tests."],
              ["Tue/Thu", "1.5–2h Cloud rebuild: Kubernetes the Hard Way manually once, then KodeKloud/killer.sh CKA labs."],
              ["Saturday", "3–4h CEH coursework/practice exams — close it out this phase."],
              ["Sunday", "2h: one cold email drafted/sent (bias German/Dutch) + resume iteration."],
              ["Every day", "20–30 min explaining yesterday's Go/K8s work out loud, no notes."],
            ].map(([k, v]) => (
              <div key={k} className="bg-surface p-4">
                <div className="mono-label text-primary">{k}</div>
                <div className="mt-1 text-sm text-muted-foreground">{v}</div>
              </div>
            ))}
          </div>
          <p className="mt-4 text-sm">
            <b className="text-foreground">Self-test, 30 Sep 2026</b> — explain from memory: (a)
            how goroutines/channels prevented a race in the URL-shortener project, (b) Deployment
            vs StatefulSet and why UPF session state cares, (c) PDR/FAR handling end to end. Any
            faltering means it&apos;s a genuine gap, not just underconfidence.
          </p>

          <h3 className="mt-8 font-display text-xl font-semibold text-foreground">
            Phase 1–6 — Oct 2026 through Fall 2028
          </h3>
          <ol className="mt-3 space-y-4 border-l border-primary/25 pl-6">
            {[
              ["Oct–Dec 2026", "1 application round/month (5–10 targeted) + 2 cold emails. Professor sign-off for DAAD WISE by mid-Oct. Submit 1 Nov. OSCP prep starts once CEH closes."],
              ["Jan–Apr 2027", "OSCP exam attempt. CKA prep begins. IELTS/TOEFL booked and sat."],
              ["May–Jul 2027", "Summer placement executes (DAAD WISE or corporate). CKA exam. Signature project shipped and blogged."],
              ["Aug–Dec 2027", "CKS exam. SOP/LOR/transcripts assembled. Applications submitted per each program's recurring deadline pattern. Jan '28 internship recruiting runs in parallel."],
              ["Jan–Jun 2028", "Six-month internship, final semester. Admission decisions arrive — decide once they're all in."],
              ["Jul–Sep 2028", "Graduate, visa paperwork, relocate, start the masters."],
            ].map(([when, what]) => (
              <li key={when} className="relative">
                <span className="absolute -left-[27px] top-1.5 h-2.5 w-2.5 rounded-full border-2 border-primary bg-background" />
                <div className="mono-label text-amber">{when}</div>
                <p className="mt-1 text-sm text-muted-foreground">{what}</p>
              </li>
            ))}
          </ol>
        </Block>

        <Block id="altpath" eyebrow="ALT_PATH" title="Alternate path — job first, fully fleshed">
          <p>
            Not a footnote — a real second plan if Phase 0&apos;s self-test changes the read, or an
            offer is too good to defer. Redirect Phase 4&apos;s energy into landing the strongest
            full-time offer instead of grad applications — nothing from Phases 0–3 is wasted, OSCP/
            CKA/CKS/the signature project sell just as hard in an interview. Target companies with
            India + abroad offices (Qualcomm, Cisco, Nokia, Juniper, Google, Microsoft, Amazon)
            specifically for intra-company-transfer optionality, sidestepping H-1B entirely. After
            18–24 months, ask about mobility programs. Georgia Tech OMS and Berkeley MICS stay
            available part-time the whole time — the hedge that keeps this compatible with an
            eventual masters. Revisit an on-site masters in 2028–29 with real experience behind it.
          </p>
        </Block>

        <footer className="border-t border-border pt-6">
          <p className="mono-label leading-relaxed">
            Sources: crisp-da.de · cysec.tu-darmstadt.de · epfl.ch · kastel.kit.edu · polimi.it ·
            telecom-paris.fr · sciences.sorbonne-universite.fr · bristol.ac.uk · liu.se ·
            chalmers.se · uni.lu/snt-en · mscicsm.hkust.edu.hk · cse.cuhk.edu.hk · kaist.ac.kr ·
            cerias.purdue.edu · kth.se · sec.in.tum.de · cispa.de · kuleuven.be · ru.nl · vusec.net
            · cyber.technion.ac.il · international.tau.ac.il · ntnu.edu · dtu.dk · uwaterloo.ca ·
            comp.nus.edu.sg · ntu.edu.sg/cysren · unsw.adfa.edu.au · tcd.ie · ucd.ie ·
            cseweb.ucsd.edu/~savage · summerofcode.withgoogle.com · github.blog/security ·
            eurecom.fr · secclo.eu · aalto.fi · cysec.uni-saarland.de · informatik.rub.de ·
            utwente.nl · cmu.edu/ini · pe.gatech.edu · engineering.nyu.edu · ischool.berkeley.edu ·
            isi.jhu.edu. Light-tagged entries not individually re-verified this pass. Updated 14
            Jul 2026.
          </p>
        </footer>
      </main>
    </div>
  );
}

/* ================= shared bits ================= */

function Block({
  id,
  eyebrow,
  title,
  note,
  children,
}: {
  id?: string;
  eyebrow: string;
  title: string;
  note?: string;
  children: ReactNode;
}) {
  return (
    <section id={id} className="scroll-mt-16">
      <div className="mb-4 flex items-center gap-3">
        <span className="mono-label text-primary">// {eyebrow}</span>
        <span className="h-px flex-1 bg-border" />
      </div>
      <h2 className="font-display text-2xl font-bold tracking-tight text-foreground md:text-3xl">
        {title}
      </h2>
      {note && <p className="mt-2 text-sm text-muted-foreground">{note}</p>}
      <div className="mt-5 space-y-4 text-sm leading-relaxed text-muted-foreground md:text-[15px]">
        {children}
      </div>
    </section>
  );
}

function RankList({ items }: { items: [string, string, string][] }) {
  return (
    <ol className="space-y-0 divide-y divide-border border-y border-border">
      {items.map(([name, country, desc], i) => (
        <li key={name} className="flex gap-4 py-3">
          <span className="mono-label w-6 shrink-0 text-primary">{String(i + 1).padStart(2, "0")}</span>
          <div>
            <div className="text-sm font-semibold text-foreground">
              {name} <span className="mono-label ml-1 text-muted-foreground">{country}</span>
            </div>
            <p className="mt-0.5 text-sm text-muted-foreground">{desc}</p>
          </div>
        </li>
      ))}
    </ol>
  );
}

function RegionTable({ region, rows }: { region: string; rows: [string, string, string][] }) {
  return (
    <div className="mb-6">
      <div className="mono-label mb-2 text-amber">{region}</div>
      <div className="surface-panel divide-y divide-border">
        {rows.map(([name, cc, note]) => {
          const light = cc.includes("light");
          const country = cc.replace("·light", "");
          return (
            <div key={name} className="flex flex-wrap items-baseline gap-x-3 gap-y-1 p-3">
              <span className="text-sm font-semibold text-foreground">{name}</span>
              <span className="mono-label">{country}</span>
              {light && (
                <span className="border border-amber/30 bg-amber/10 px-1.5 py-0.5 font-mono text-[9px] uppercase text-amber">
                  light
                </span>
              )}
              <span className="w-full text-sm text-muted-foreground sm:w-auto sm:flex-1">
                {note}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}
