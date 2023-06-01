import type { NextPage } from "next";

import { Launchpad } from "../components/Launchpad";

const Home: NextPage = () => {
  return (
    <div className="flex flex-col items-center gap-10">
      <div className="flex max-h-[312px] items-center justify-center overflow-y-hidden">
        <div className="font-orbitron text-2xl font-medium">
          Cadence Finance
        </div>
      </div>
      <Launchpad />
    </div>
  );
};

export default Home;
