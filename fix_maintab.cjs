const fs = require('fs');
let code = fs.readFileSync('src/components/MainTab.tsx', 'utf8');

// 1. Add isFetchingInfo state and effect
const stateToAdd = `
  const [isFetchingInfo, setIsFetchingInfo] = useState(false);
  useEffect(() => {
    if (!customCode || customCode.length !== 6) return;
    const fetchInfo = async () => {
      setIsFetchingInfo(true);
      try {
        const mode = localStorage.getItem("kiwoom_trading_mode") || "MOCK";
        const accessToken = sessionStorage.getItem("kiwoom_access_token");
        if (!accessToken) return;
        const res = await fetch("/api/dostk/mrkcond", {
          method: "POST",
          headers: {
            "Content-Type": "application/json;charset=UTF-8",
            "Authorization": \`Bearer \${accessToken}\`,
            "api-id": "ka10001",
            "x-trading-mode": mode
          },
          body: JSON.stringify({ stock_code: customCode })
        });
        if (res.ok) {
          const data = await res.json();
          if (data?.output?.name) {
            setCustomName(data.output.name);
          } else {
            setCustomName("");
          }
        }
      } catch (e) {
        console.error(e);
      } finally {
        setIsFetchingInfo(false);
      }
    };
    fetchInfo();
  }, [customCode]);
`;

code = code.replace("  const [customName, setCustomName] = useState(\"\");", "  const [customName, setCustomName] = useState(\"\");" + stateToAdd);

// 2. Replace handleCustomSubmit entirely
const oldSubmitRegex = /const handleCustomSubmit = \(e: FormEvent\) => \{[\s\S]*?setSearchedStocks\(null\); \/\/ Reset search state\n  \};/;

const newSubmit = `
  const handleCustomSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (editingSlotIndex === null || !customCode) return;
    
    // Attempt to fetch price one last time for basePrice
    let basePrice = 0;
    let fetchedName = customName || customCode;
    try {
        const mode = localStorage.getItem("kiwoom_trading_mode") || "MOCK";
        const accessToken = sessionStorage.getItem("kiwoom_access_token");
        if (accessToken) {
            const res = await fetch("/api/dostk/mrkcond", {
              method: "POST",
              headers: {
                "Content-Type": "application/json;charset=UTF-8",
                "Authorization": \`Bearer \${accessToken}\`,
                "api-id": "ka10001",
                "x-trading-mode": mode
              },
              body: JSON.stringify({ stock_code: customCode })
            });
            if (res.ok) {
                const data = await res.json();
                if (data?.output?.price) basePrice = parseInt(data.output.price, 10);
                if (data?.output?.name) fetchedName = data.output.name;
            }
        }
    } catch (e) {}

    setWatchlist(prev => {
      const copy = [...prev];
      copy[editingSlotIndex] = {
        code: customCode,
        name: fetchedName,
        currentPrice: basePrice,
        open: basePrice,
        high: basePrice,
        low: basePrice,
        volume: 0,
        prevClose: basePrice,
        transactionAmount: 0,
        history250dHigh: basePrice,
        maxVolumePerSecond: 0,
        kValue: 0.5,
        targetPrice: basePrice,
        bbUpper: basePrice,
        bbMiddle: basePrice,
        bbLower: basePrice,
        bbWidth: 0,
        stochK: 0,
        stochD: 0
      };
      return copy;
    });
    setEditingSlotIndex(null);
    setCustomCode("");
    setCustomName("");
    setSearchQuery("");
    setSearchedStocks(null);
  };
`;

code = code.replace(oldSubmitRegex, newSubmit);
fs.writeFileSync('src/components/MainTab.tsx', code);
