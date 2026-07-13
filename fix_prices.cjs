const fs = require('fs');
let code = fs.readFileSync('src/components/MainTab.tsx', 'utf8');

const replaceStr = `
            if (res.ok) {
              const data = await res.json();
              if (data?.output && data.output.price) {
                return { ...s, currentPrice: parseInt(data.output.price, 10) };
              }
            }
          } catch (e) {
            console.error("Price fetch error:", e);
          }
          return s;
`;

const newStr = `
            if (res.ok) {
              const data = await res.json();
              if (data?.output && data.output.price) {
                return { ...s, currentPrice: parseInt(data.output.price, 10) };
              }
            }
          } catch (e) {
            console.error("Price fetch error:", e);
          }
          // If we reach here, we didn't get a valid price from the API.
          // Set to 0 to show N/A as requested by user.
          return { ...s, currentPrice: 0 };
`;

code = code.replace(replaceStr, newStr);

fs.writeFileSync('src/components/MainTab.tsx', code);
