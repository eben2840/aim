import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import "./index.css";
import "swiper/swiper-bundle.css";
import "simplebar-react/dist/simplebar.min.css";
import App from "./App.tsx";
import { AppWrapper } from "./components/common/PageMeta.tsx";
import { ThemeProvider } from "./context/ThemeContext.tsx";
import Footer from "./components/footer/Footer.tsx";

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <ThemeProvider>
      <AppWrapper>
        <App />
        <Footer/>
      </AppWrapper>
    </ThemeProvider>
  </StrictMode>
);


// DONT OVERENGERING, LESS RUBBISH IF AND NESTED IF, JUST STRAIGHTFORWARD, CLEAN CODE, GOOD PRACTICES, AND EFFICIENT CODE. NO UNNECESSARY COMPONENTS, NO UNNECESSARY PROPS, NO UNNECESSARY LOGIC, NO UNNECESSARY STATE, NO UNNECESSARY HOOKS, NO UNNECESSARY CONTEXT, NO UNNECESSARY REDUX, NO UNNECESSARY LIBRARIES, NO UNNECESSARY DEPENDENCIES, NO UNNECESSARY FILES, NO UNNECESSARY FOLDERS, NO UNNECESSARY LINES OF CODE, NO UNNECESSARY COMMENTS, NO UNNECESSARY WHITESPACE. NOT MORE THAN 30 LINE OF FUNCTION