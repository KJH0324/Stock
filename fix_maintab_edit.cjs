const fs = require('fs');
let code = fs.readFileSync('src/components/MainTab.tsx', 'utf8');

// We want to remove customPrice and the form fields for price and name when editing slot,
// and auto-fetch them from mrkcond API.

code = code.replace(/const \[customPrice, setCustomPrice\] = useState\("10000"\);/, "");

// Replace the edit slot form logic
const newEditForm = `
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
  };
`;

code = code.replace(/const handleCustomSubmit = \(e: FormEvent\) => \{[\s\S]*?setCustomPrice\("10000"\);\n  \};/, newEditForm);

// Also remove POPULAR_STOCKS rendering
code = code.replace(/<div className="bg-gray-950 rounded-xl p-3 max-h-48 overflow-y-auto">[\s\S]*?<\/div>\n              <\/div>/, "");

fs.writeFileSync('src/components/MainTab.tsx', code);
